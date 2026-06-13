'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { ComponentStatus } from '@/lib/types';
import { useLang } from '@/lib/i18n';

interface Day {
  date: string;         // YYYY-MM-DD
  status: ComponentStatus;
  pct: number;          // 0–100 uptime that day
}

interface Props {
  days: Day[];
  overallPct?: number;
}

const dayColor: Record<ComponentStatus, string> = {
  Healthy:     'bg-green-500',
  Degraded:    'bg-amber-400',
  Unhealthy:   'bg-red-500',
  Maintenance: 'bg-blue-400',
  Unknown:     'bg-navy-600',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function UptimeBar({ days, overallPct }: Props) {
  const [hovered, setHovered] = useState<Day | null>(null);
  const { t } = useLang();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{t('uptime_bar')}</span>
        {overallPct !== undefined && (
          <span className={clsx(
            'text-xs font-semibold tabular-nums',
            overallPct >= 99.9 ? 'text-green-400' :
            overallPct >= 99   ? 'text-amber-400' : 'text-red-400'
          )}>
            {overallPct.toFixed(2)}%
          </span>
        )}
      </div>

      <div className="flex gap-[2px] h-7 items-stretch">
        {days.map((d, i) => (
          <div
            key={i}
            className={clsx('flex-1 rounded-[2px] cursor-default transition-opacity', dayColor[d.status])}
            style={{ opacity: hovered === d ? 1 : 0.75 }}
            onMouseEnter={() => setHovered(d)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>

      {/* Hover label */}
      <div className="h-6 mt-1.5 flex items-center">
        {hovered ? (
          <span className="text-xs text-slate-400">
            <span className="text-slate-200 font-medium">{fmt(hovered.date)}</span>
            {' · '}{hovered.pct.toFixed(1)}% {t('uptime_short')}
            {hovered.status !== 'Healthy' && (
              <span className={clsx(
                'ml-1.5 text-xs font-medium',
                hovered.status === 'Degraded' ? 'text-amber-400' : 'text-red-400'
              )}>
                ({t((`badge_${hovered.status}`) as any)})
              </span>
            )}
          </span>
        ) : (
          <div className="flex items-center justify-between w-full text-xs text-slate-600">
            <span>{days[0]?.date ? fmt(days[0].date) : ''}</span>
            <span>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
