'use client';

import clsx from 'clsx';
import type { ComponentStatus } from '@/lib/types';
import { useLang } from '@/lib/i18n';
import type { TKey } from '@/lib/i18n';

const config: Record<ComponentStatus, { dot: string; text: string; labelKey: TKey }> = {
  Healthy:     { dot: 'bg-green-500',  text: 'text-green-400',  labelKey: 'badge_Healthy' },
  Degraded:    { dot: 'bg-amber-400',  text: 'text-amber-400',  labelKey: 'badge_Degraded' },
  Unhealthy:   { dot: 'bg-red-500',    text: 'text-red-400',    labelKey: 'badge_Unhealthy' },
  Maintenance: { dot: 'bg-blue-500',   text: 'text-blue-400',   labelKey: 'badge_Maintenance' },
  Unknown:     { dot: 'bg-slate-500',  text: 'text-slate-400',  labelKey: 'badge_Unknown' },
};

interface Props {
  status: ComponentStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, showLabel = true, size = 'md' }: Props) {
  const { t } = useLang();
  const { dot, text, labelKey } = config[status] ?? config.Unknown;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={clsx(
          'rounded-full shrink-0',
          dot,
          size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
          status === 'Healthy' && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className={clsx('font-medium', text, size === 'sm' ? 'text-xs' : 'text-sm')}>
          {t(labelKey)}
        </span>
      )}
    </span>
  );
}
