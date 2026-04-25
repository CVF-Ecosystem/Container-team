'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    getSession,
    logout as authLogout,
    initializeAuth,
    verifySession,
    AuthSession,
    UserRole
} from '@/lib/authService';

interface AuthContextType {
    session: AuthSession | null;
    isLoggedIn: boolean;
    isAdmin: boolean;
    role: UserRole | null;
    logout: () => void;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Pages that don't require authentication
const PUBLIC_PAGES = ['/login', '/admin-reset'];

// Pages that require admin role
const ADMIN_PAGES = ['/admin', '/admin/data'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const refreshSession = useCallback(async () => {
        const currentSession = getSession();
        if (!currentSession) {
            setSession(null);
            return;
        }

        const verifiedSession = await verifySession();
        setSession(verifiedSession);
    }, []);

    const handleLogout = useCallback(() => {
        authLogout();
        setSession(null);
        router.push('/login');
    }, [router]);

    // Initialize auth and check session on mount
    useEffect(() => {
        let cancelled = false;

        const bootstrap = async () => {
            await initializeAuth();
            if (cancelled) return;

            await refreshSession();
            if (!cancelled) {
                setIsLoading(false);
            }
        };

        void bootstrap();

        return () => {
            cancelled = true;
        };
    }, [refreshSession]);

    // Route protection
    useEffect(() => {
        if (isLoading) return;

        const isPublicPage = PUBLIC_PAGES.some(p => pathname?.startsWith(p));
        const isAdminPage = ADMIN_PAGES.some(p => pathname?.startsWith(p));

        // If not logged in and not on public page, redirect to login
        if (!session && !isPublicPage) {
            const currentSession = getSession();
            if (currentSession) {
                setSession(currentSession);
                void refreshSession();
                return;
            }

            router.push('/login');
            return;
        }

        // If logged in but not admin trying to access admin page
        if (session && isAdminPage && session.role !== 'admin') {
            router.push('/dashboard');
            return;
        }

        // If logged in and on login page, redirect to appropriate page
        if (session && pathname === '/login') {
            router.push(session.role === 'admin' ? '/admin/data' : '/dashboard');
        }
    }, [session, pathname, isLoading, router, refreshSession]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
                <div className="text-[var(--color-text-primary)] text-xl">Đang tải...</div>
            </div>
        );
    }

    const value: AuthContextType = {
        session,
        isLoggedIn: !!session,
        isAdmin: session?.role === 'admin',
        role: session?.role || null,
        logout: handleLogout,
        refreshSession,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
