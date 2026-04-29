'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge, Card, SectionLabel } from '@/components/cosmic';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/components/AuthProvider';
import type { OperationsAlert } from '@tanthuan/shared-types';

type AlertTone = 'accent' | 'warning' | 'danger';

const SEVERITY_TONE: Record<OperationsAlert['severity'], AlertTone> = {
  info: 'accent',
  warning: 'warning',
  critical: 'danger',
};

export default function AlertsPanel({ date }: { date: string }) {
  const { session } = useAuth();
  const isAdmin = session?.role === 'admin' && session.mode !== 'local-dev';
  const [alerts, setAlerts] = useState<OperationsAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      const result = await apiClient.getOperationsDashboard(date);
      if (cancelled || result.error || !result.data) return;
      setAlerts(result.data.alerts);
      setLoaded(true);
    };
    void load();
    return () => { cancelled = true; };
  }, [date, isAdmin]);

  if (!isAdmin || !loaded) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
        <SectionLabel className="!mb-0">Cảnh báo vận hành</SectionLabel>
      </div>
      {alerts.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-[var(--color-success)]">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Không có cảnh báo.
        </p>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map(alert => (
            <div
              key={`${alert.code}-${alert.department ?? ''}-${alert.shift ?? ''}`}
              className="flex items-start gap-2"
            >
              <Badge tone={SEVERITY_TONE[alert.severity] ?? 'muted'}>{alert.severity}</Badge>
              <p className="text-sm text-[var(--color-text-secondary)]">{alert.message}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
