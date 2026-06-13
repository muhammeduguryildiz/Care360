'use client';

import Link from 'next/link';
import useSWR from 'swr';
import clsx from 'clsx';
import type { ComponentStatus, StatusResponse } from '@/lib/types';
import { groupSlug, worstStatus } from '@/lib/utils';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import StatusPieChart from '@/components/StatusPieChart';
import ResponseBarChart from '@/components/ResponseBarChart';
import IncidentBanner from '@/components/IncidentBanner';
import { useLang } from '@/lib/i18n';
import type { TKey } from '@/lib/i18n';

const OVERALL_BANNER_KEYS: Record<ComponentStatus, { bg: string; labelKey: TKey }> = {
  Healthy:     { bg: 'from-green-600 to-green-700',  labelKey: 'overall_healthy' },
  Degraded:    { bg: 'from-amber-500 to-amber-600',  labelKey: 'overall_degraded' },
  Unhealthy:   { bg: 'from-red-600   to-red-700',    labelKey: 'overall_unhealthy' },
  Maintenance: { bg: 'from-blue-600  to-blue-700',   labelKey: 'overall_maintenance' },
  Unknown:     { bg: 'from-slate-600 to-slate-700',  labelKey: 'overall_unknown' },
};

const DOT_COLOR: Record<string, string> = {
  Healthy:     'bg-green-500',
  Degraded:    'bg-amber-400',
  Unhealthy:   'bg-red-500',
  Maintenance: 'bg-blue-400',
  Unknown:     'bg-slate-500',
};

function GroupCard({ name, components }: { name: string; components: StatusResponse['groups'][0]['components'] }) {
  const { t } = useLang();
  const status = worstStatus(components.map((c) => c.status));
  const healthyCount = components.filter((c) => c.status === 'Healthy').length;
  const slug = groupSlug(name);

  return (
    <Link
      href={`/category/${slug}`}
      className="block bg-navy-800 rounded-xl border border-navy-600 p-4 hover:bg-navy-750 hover:border-navy-500 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors">
          {name}
        </h3>
        <StatusBadge status={status as ComponentStatus} showLabel={false} />
      </div>
      <p className="text-2xl font-bold text-slate-100">
        {healthyCount}
        <span className="text-sm font-normal text-slate-500 ml-1">/ {components.length}</span>
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{t('components_healthy')}</p>
      <div className="mt-3 flex gap-1 flex-wrap">
        {components.map((c) => (
          <span
            key={c.id}
            title={`${c.name}: ${c.status}`}
            className={clsx(
              'h-2 w-6 rounded-full',
              DOT_COLOR[c.status] ?? 'bg-slate-600'
            )}
          />
        ))}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { t } = useLang();
  const { data, error, isLoading } = useSWR<StatusResponse>(
    '/api/status',
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-500 text-sm animate-pulse">
        {t('loading')}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-950/60 border border-red-700 px-6 py-4 text-red-300 text-sm">
        Unable to load status. Retrying…
      </div>
    );
  }

  const overall = (data.overall ?? 'Unknown') as ComponentStatus;
  const banner = OVERALL_BANNER_KEYS[overall] ?? OVERALL_BANNER_KEYS.Unknown;

  const allComponents = data.groups.flatMap((g) => g.components);
  const healthyCount   = allComponents.filter((c) => c.status === 'Healthy').length;
  const degradedCount  = allComponents.filter((c) => c.status === 'Degraded').length;
  const unhealthyCount = allComponents.filter((c) => c.status === 'Unhealthy').length;
  const issuesCount    = degradedCount + unhealthyCount;

  const pieData: { name: ComponentStatus; value: number }[] = [
    { name: 'Healthy',     value: healthyCount },
    { name: 'Degraded',    value: degradedCount },
    { name: 'Unhealthy',   value: unhealthyCount },
    { name: 'Maintenance', value: allComponents.filter((c) => c.status === 'Maintenance').length },
    { name: 'Unknown',     value: allComponents.filter((c) => c.status === 'Unknown').length },
  ];

  const barData = data.groups.map((g) => {
    const timed = g.components.filter((c) => c.responseTimeMs > 0);
    const avg = timed.length > 0
      ? Math.round(timed.reduce((s, c) => s + c.responseTimeMs, 0) / timed.length)
      : 0;
    return {
      name: g.name,
      ms: avg,
      status: worstStatus(g.components.map((c) => c.status)) as string,
    };
  }).filter((d) => d.ms > 0);

  const healthyPct = Math.round(healthyCount / allComponents.length * 100);

  return (
    <div className="space-y-8">

      {/* Overall banner */}
      <div className={clsx(
        'rounded-2xl bg-gradient-to-r text-white px-6 py-6 shadow-lg',
        banner.bg
      )}>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
          {t('current_status')}
        </p>
        <h1 className="text-2xl font-bold">{t(banner.labelKey)}</h1>
        <p className="text-sm opacity-70 mt-1">
          {t('last_updated')} {new Date(data.checkedAt).toLocaleTimeString()} ·{' '}
          {allComponents.length} {t('components_monitored')}
        </p>
      </div>

      {/* Active incidents */}
      <IncidentBanner incidents={data.activeIncidents ?? []} />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('stat_total')} value={allComponents.length} accent="slate" />
        <StatCard title={t('stat_healthy')} value={healthyCount} sub={`${healthyPct}${t('operational_pct')}`} accent="green" />
        <StatCard title={t('stat_issues')} value={issuesCount} sub={`${degradedCount} ${t('degraded_count')}, ${unhealthyCount} ${t('down_count')}`} accent={issuesCount > 0 ? 'red' : 'slate'} />
        <StatCard title={t('stat_incidents')} value={data.activeIncidents.length} sub={t('tap_to_view')} accent={data.activeIncidents.length > 0 ? 'amber' : 'slate'} href="/incidents" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-navy-800 rounded-xl border border-navy-600 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('chart_distribution')}</h2>
          <StatusPieChart data={pieData} />
        </div>

        <div className="bg-navy-800 rounded-xl border border-navy-600 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('chart_response')}</h2>
          {barData.length > 0
            ? <ResponseBarChart data={barData} layout="horizontal" />
            : <p className="text-sm text-slate-500 py-8 text-center">{t('no_latency')}</p>
          }
        </div>
      </div>

      {/* Group cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          {t('service_groups')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.groups.map((g) => (
            <GroupCard key={g.name} name={g.name} components={g.components} />
          ))}
        </div>
      </div>

      {/* Recent incidents */}
      {data.activeIncidents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('active_incidents_section')}</h2>
            <Link href="/incidents" className="text-xs text-indigo-400 hover:text-indigo-300">{t('view_all')}</Link>
          </div>
          <div className="space-y-2">
            {data.activeIncidents.map((inc) => (
              <div key={inc.id} className="bg-navy-800 rounded-xl border border-amber-700/50 px-4 py-3 flex items-center gap-4">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{inc.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{inc.status} · {inc.severity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
