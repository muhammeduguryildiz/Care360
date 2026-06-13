'use client';

import useSWR from 'swr';
import clsx from 'clsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import type { Incident } from '@/lib/types';
import { useLang } from '@/lib/i18n';
import type { TKey } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

const SEVERITY_KEYS: Record<string, TKey> = {
  critical:    'severity_critical',
  major:       'severity_major',
  minor:       'severity_minor',
  maintenance: 'severity_maintenance',
};

const STATUS_KEYS: Record<string, TKey> = {
  investigating: 'inc_investigating',
  identified:    'inc_identified',
  monitoring:    'inc_monitoring',
  resolved:      'inc_resolved',
};

// ── Badge helpers ─────────────────────────────────────────────────────────────

const severityBadge: Record<string, string> = {
  critical:    'bg-red-950 text-red-400',
  major:       'bg-orange-950 text-orange-400',
  minor:       'bg-yellow-950 text-yellow-400',
  maintenance: 'bg-blue-950 text-blue-400',
};

const statusBadge: Record<string, string> = {
  investigating: 'bg-red-950 text-red-400',
  identified:    'bg-orange-950 text-orange-400',
  monitoring:    'bg-amber-950 text-amber-400',
  resolved:      'bg-green-950 text-green-400',
};

const severityOrder: Record<string, number> = {
  critical: 0, major: 1, minor: 2, maintenance: 3,
};

// ── MTTR helpers ──────────────────────────────────────────────────────────────

function resolutionMinutes(inc: Incident): number | null {
  if (!inc.resolvedAt) return null;
  return (new Date(inc.resolvedAt).getTime() - new Date(inc.createdAt).getTime()) / 60_000;
}

function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function buildMonthlyChart(incidents: Incident[]) {
  const counts: Record<string, number> = {};
  for (const inc of incidents) {
    const key = inc.createdAt.slice(0, 7);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: new Date(month + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      count,
    }));
}

function CustomBarTooltip({ active, payload, label, dark, incidentsUnit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: dark ? '#0d1b2e' : '#ffffff',
      border: `1px solid ${dark ? '#1e3a5c' : '#e2e8f0'}`,
      borderRadius: 8,
      padding: '8px 12px',
    }}>
      <p style={{ color: dark ? '#64748b' : '#94a3b8', fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#818cf8', fontSize: 14, fontWeight: 700 }}>{payload[0].value} {incidentsUnit}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IncidentsPage() {
  const { t } = useLang();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const { data: incidents, isLoading } = useSWR<Incident[]>(
    '/api/incidents',
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 120_000 }
  );

  const resolved  = (incidents ?? []).filter((i) => i.status === 'resolved');
  const active    = (incidents ?? []).filter((i) => i.status !== 'resolved');
  const resMins   = resolved.map((i) => resolutionMinutes(i)).filter((v): v is number => v !== null);
  const mttr      = resMins.length ? resMins.reduce((s, v) => s + v, 0) / resMins.length : null;
  const maxMttr   = resMins.length ? Math.max(...resMins) : null;
  const monthData = incidents ? buildMonthlyChart(incidents) : [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-100">{t('incident_history')}</h1>

      {isLoading && <p className="text-sm text-slate-500 animate-pulse">{t('loading')}</p>}

      {/* ── Analytics ─────────────────────────────────────────────────────── */}
      {!isLoading && incidents && incidents.length > 0 && (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t('stat_total_90'),  value: incidents.length,                         color: 'text-slate-200' },
              { label: t('stat_active'),    value: active.length,                            color: active.length ? 'text-red-400' : 'text-green-400' },
              { label: t('stat_mttr'),      value: mttr    !== null ? fmtDuration(mttr)    : '—', color: 'text-indigo-400' },
              { label: t('stat_longest'),   value: maxMttr !== null ? fmtDuration(maxMttr) : '—', color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-navy-800 rounded-xl border border-navy-600 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <p className={clsx('text-2xl font-bold mt-1', color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Incidents per month bar chart */}
          {monthData.length > 0 && (
            <div className="bg-navy-800 rounded-xl border border-navy-600 p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('chart_per_month')}</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: dark ? '#475569' : '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: dark ? '#475569' : '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    content={<CustomBarTooltip dark={dark} incidentsUnit={t('incidents_unit')} />}
                    cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive>
                    {monthData.map((_, i) => (
                      <Cell key={i} fill="#6366f1" opacity={0.75 + (i / monthData.length) * 0.25} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── Incident list ──────────────────────────────────────────────────── */}
      {!isLoading && (!incidents || incidents.length === 0) && (
        <div className="rounded-lg bg-green-950/60 border border-green-800 px-6 py-8 text-center">
          <p className="text-green-400 font-medium">{t('no_incidents')}</p>
          <p className="text-green-500/70 text-sm mt-1">{t('no_incidents_sub')}</p>
        </div>
      )}

      <div className="space-y-3">
        {(incidents ?? [])
          .slice()
          .sort((a, b) => {
            const aRes = a.status === 'resolved' ? 1 : 0;
            const bRes = b.status === 'resolved' ? 1 : 0;
            if (aRes !== bRes) return aRes - bRes;
            const sA = severityOrder[a.severity] ?? 9;
            const sB = severityOrder[b.severity] ?? 9;
            if (sA !== sB) return sA - sB;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .map((inc) => {
            const mins = resolutionMinutes(inc);
            return (
              <div key={inc.id} className={clsx(
                'rounded-xl bg-navy-800 border px-5 py-4',
                inc.status !== 'resolved' ? 'border-amber-700/50' : 'border-navy-600'
              )}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <h2 className="text-base font-semibold text-slate-100">{inc.title}</h2>
                  <div className="flex gap-2">
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', severityBadge[inc.severity] ?? severityBadge.minor)}>
                      {SEVERITY_KEYS[inc.severity] ? t(SEVERITY_KEYS[inc.severity]) : inc.severity}
                    </span>
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', statusBadge[inc.status] ?? statusBadge.monitoring)}>
                      {STATUS_KEYS[inc.status] ? t(STATUS_KEYS[inc.status]) : inc.status}
                    </span>
                  </div>
                </div>

                {inc.body && <p className="text-sm text-slate-400 mb-3 whitespace-pre-line">{inc.body}</p>}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{t('inc_started')} {new Date(inc.createdAt).toLocaleString()}</span>
                  {inc.resolvedAt && <span>{t('inc_resolved_at')} {new Date(inc.resolvedAt).toLocaleString()}</span>}
                  {mins !== null && (
                    <span className="text-indigo-400 font-medium">{t('inc_ttr')} {fmtDuration(mins)}</span>
                  )}
                  {inc.affectedComponents.length > 0 && (
                    <span>{t('inc_affected')} {inc.affectedComponents.join(', ')}</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
