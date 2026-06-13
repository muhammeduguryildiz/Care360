'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { ComponentSnapshot } from '@/lib/types';
import StatusBadge from './StatusBadge';
import { useLang } from '@/lib/i18n';
import type { TKey } from '@/lib/i18n';

const borderColor: Record<string, string> = {
  Healthy:     'border-green-700/60',
  Degraded:    'border-amber-600/60',
  Unhealthy:   'border-red-600/60',
  Maintenance: 'border-blue-600/60',
  Unknown:     'border-navy-600',
};

function fmt(ms: number) {
  if (ms === 0) return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

function relativeTime(iso: string | null, t: (k: TKey, v?: Record<string, string | number>) => string): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t('ago_s', { n: s });
  const m = Math.floor(s / 60);
  if (m < 60) return t('ago_m', { n: m });
  return t('ago_h', { n: Math.floor(m / 60) });
}

export default function StatusCard({ component }: { component: ComponentSnapshot }) {
  const { t } = useLang();
  const latency = fmt(component.responseTimeMs);
  const checked = relativeTime(component.checkedAt, t);

  return (
    <Link
      href={`/components/${component.id}`}
      className={clsx(
        'flex items-center justify-between rounded-lg border px-4 py-3 bg-navy-800',
        'hover:bg-navy-750 transition-colors group',
        borderColor[component.status] ?? borderColor.Unknown
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate group-hover:text-white">
          {component.name}
        </p>
        {component.message && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{component.message}</p>
        )}
      </div>

      <div className="flex items-center gap-4 ml-4 shrink-0">
        {latency && (
          <span className="text-xs text-slate-500 tabular-nums hidden sm:block">{latency}</span>
        )}
        {checked && (
          <span className="text-xs text-slate-500 hidden md:block">{checked}</span>
        )}
        <StatusBadge status={component.status} size="md" />
      </div>
    </Link>
  );
}
