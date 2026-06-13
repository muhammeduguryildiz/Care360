'use client';

import clsx from 'clsx';
import type { Incident } from '@/lib/types';
import { useLang } from '@/lib/i18n';
import type { TKey } from '@/lib/i18n';

const severity: Record<string, { bg: string; text: string; icon: string }> = {
  critical:    { bg: 'bg-red-950/60 border-red-600',      text: 'text-red-300',    icon: '🔴' },
  major:       { bg: 'bg-orange-950/60 border-orange-600', text: 'text-orange-300', icon: '🟠' },
  minor:       { bg: 'bg-yellow-950/60 border-yellow-600', text: 'text-yellow-300', icon: '🟡' },
  maintenance: { bg: 'bg-blue-950/60 border-blue-600',     text: 'text-blue-300',   icon: '🔵' },
};

const STATUS_KEYS: Record<string, TKey> = {
  investigating: 'inc_investigating',
  identified:    'inc_identified',
  monitoring:    'inc_monitoring',
  resolved:      'inc_resolved',
};

export default function IncidentBanner({ incidents }: { incidents: Incident[] }) {
  const { t } = useLang();

  if (incidents.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {incidents.map((inc) => {
        const s = severity[inc.severity] ?? severity.minor;
        return (
          <div
            key={inc.id}
            className={clsx('border-l-4 rounded-r-lg px-4 py-3', s.bg)}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={clsx('text-sm font-semibold', s.text)}>
                  {inc.title}
                  <span className="ml-2 font-normal opacity-70">
                    — {STATUS_KEYS[inc.status] ? t(STATUS_KEYS[inc.status]) : inc.status}
                  </span>
                </p>
                {inc.body && (
                  <p className={clsx('text-sm mt-0.5 opacity-80', s.text)}>{inc.body}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
