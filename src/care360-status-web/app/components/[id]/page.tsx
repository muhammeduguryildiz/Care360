'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import clsx from 'clsx';
import type { HistoryResponse, HistoryPoint, ComponentStatus } from '@/lib/types';
import { worstStatus } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import LatencyChart from '@/components/LatencyChart';
import UptimeBar from '@/components/UptimeBar';
import { useLang } from '@/lib/i18n';

type Range = '7d' | '30d' | '90d';

const rangeOptions: Range[] = ['7d', '30d', '90d'];
import type { TKey } from '@/lib/i18n';
const RANGE_KEYS: Record<Range, TKey> = { '7d': 'range_7d', '30d': 'range_30d', '90d': 'range_90d' };

// ── Compute daily uptime buckets from the series ──────────────────────────────
function computeDailyUptime(series: HistoryPoint[], days: number) {
  const byDay = new Map<string, HistoryPoint[]>();
  for (const p of series) {
    const day = p.checkedAt.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(p);
  }

  const result: { date: string; status: ComponentStatus; pct: number }[] = [];
  const now = new Date();
  for (let d = days - 1; d >= 0; d--) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - d);
    const dateStr = dt.toISOString().slice(0, 10);
    const pts = byDay.get(dateStr) ?? [];
    if (pts.length === 0) {
      result.push({ date: dateStr, status: 'Unknown', pct: 0 });
    } else {
      const healthy = pts.filter((p) => p.status === 'Healthy').length;
      const pct = (healthy / pts.length) * 100;
      result.push({
        date: dateStr,
        status: worstStatus(pts.map((p) => p.status)) as ComponentStatus,
        pct,
      });
    }
  }
  return result;
}

export default function ComponentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { t } = useLang();
  const [range, setRange] = useState<Range>('7d');

  const { data, isLoading } = useSWR<HistoryResponse>(
    `/api/components/${id}/history?range=${range}`,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 120_000 }
  );

  const latest        = data?.series[0];
  const currentStatus = (latest?.status ?? 'Unknown') as ComponentStatus;
  const rangeDays     = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const dailyData     = data ? computeDailyUptime(data.series, rangeDays) : [];

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300">
          {t('back_to_status')}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{decodeURIComponent(id)}</h1>
          {latest && (
            <p className="text-sm text-slate-500 mt-1">
              {t('last_checked')} {new Date(latest.checkedAt).toLocaleString()}
            </p>
          )}
        </div>
        <StatusBadge status={currentStatus} size="md" />
      </div>

      {/* Uptime tiles */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-navy-800 border border-navy-600 px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{t('uptime_label', { range })}</p>
            <p className={clsx(
              'text-2xl font-bold mt-1',
              data.uptimePercent >= 99.9 ? 'text-green-400' :
              data.uptimePercent >= 99   ? 'text-amber-400' : 'text-red-400'
            )}>
              {data.uptimePercent.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-lg bg-navy-800 border border-navy-600 px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{t('total_checks')}</p>
            <p className="text-2xl font-bold mt-1 text-slate-200">
              {data.series.length.toLocaleString()}
            </p>
          </div>
          {latest && latest.responseTimeMs > 0 && (
            <div className="rounded-lg bg-navy-800 border border-navy-600 px-4 py-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{t('last_latency')}</p>
              <p className="text-2xl font-bold mt-1 text-slate-200">
                {latest.responseTimeMs} ms
              </p>
            </div>
          )}
        </div>
      )}

      {/* 90-day uptime bar */}
      {dailyData.length > 0 && (
        <div className="bg-navy-800 rounded-xl border border-navy-600 px-5 py-4 mb-6">
          <UptimeBar days={dailyData} overallPct={data?.uptimePercent} />
        </div>
      )}

      {/* Range selector + chart */}
      <div className="rounded-lg bg-navy-800 border border-navy-600 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">{t('latency_history')}</h2>
          <div className="flex gap-1">
            {rangeOptions.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={clsx(
                  'text-xs px-3 py-1 rounded-full transition-colors',
                  range === r
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-navy-700 hover:text-slate-200'
                )}
              >
                {t(RANGE_KEYS[r])}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="h-[240px] flex items-center justify-center text-slate-500 text-sm animate-pulse">
            {t('loading')}
          </div>
        ) : (
          <LatencyChart series={data?.series ?? []} />
        )}
      </div>

      {/* Recent events table */}
      {data && data.series.length > 0 && (
        <div className="mt-6 rounded-lg bg-navy-800 border border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-900 border-b border-navy-600">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('table_time')}</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('table_status')}</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('table_latency')}</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">{t('table_message')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700">
              {data.series.slice(0, 50).map((row, i) => (
                <tr key={i} className="hover:bg-navy-750">
                  <td className="px-4 py-2 text-slate-400 tabular-nums text-xs">
                    {new Date(row.checkedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={row.status as ComponentStatus} size="sm" />
                  </td>
                  <td className="px-4 py-2 tabular-nums text-slate-400 text-xs">
                    {row.responseTimeMs > 0 ? `${row.responseTimeMs} ms` : '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-500 text-xs truncate max-w-xs hidden md:table-cell">
                    {row.message || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
