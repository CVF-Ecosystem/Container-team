'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Boundary]', error);
    }

    // Send to Sentry (only active when NEXT_PUBLIC_SENTRY_DSN is set)
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="rounded-lg bg-red-50 p-8 shadow-sm dark:bg-red-900/10">
        <h2 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">
          Đã có lỗi xảy ra!
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Hệ thống gặp sự cố không mong muốn. Vui lòng thử lại.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => reset()}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Thử lại
          </button>
          {/* Use Next.js Link instead of window.location.href for proper client-side navigation */}
          <Link
            href="/"
            className="rounded border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Về trang chủ
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
           <div className="mt-6 max-w-md overflow-hidden rounded bg-gray-100 p-4 text-left text-xs font-mono dark:bg-gray-900">
             <p className="font-bold text-red-500">{error.message}</p>
             {error.digest && <p className="mt-1 text-gray-500">Digest: {error.digest}</p>}
           </div>
        )}
      </div>
    </div>
  );
}
