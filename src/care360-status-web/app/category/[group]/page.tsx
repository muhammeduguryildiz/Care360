'use client';

import Link from 'next/link';
import useSWR from 'swr';
import type { ComponentStatus, StatusResponse } from '@/lib/types';
import { matchGroupBySlug, worstStatus } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import StatusCard from '@/components/StatusCard';
import StatCard from '@/components/StatCard';
import ResponseBarChart from '@/components/ResponseBarChart';
import { useLang } from '@/lib/i18n';

export default function CategoryPage({ params }: { params: { group: string } }) {
  const { group: slug } = params;
  const { t } = useLang();

  const { data, isLoading } = useSWR<StatusResponse>(
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

  const group = data ? matchGroupBySlug(data.groups, slug) : undefined;

  if (!group) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-500">Group not found.</p>
        <Link href="/" className="text-indigo-400 text-sm hover:underline mt-2 block">
          {t('back_to_dashboard')}
        </Link>
      </div>
    );
  }

  const components = group.components;
  const overallStatus   = worstStatus(components.map((c) => c.status)) as ComponentStatus;
  const healthyCount    = components.filter((c) => c.status === 'Healthy').length;
  const degradedCount   = components.filter((c) => c.status === 'Degraded').length;
  const unhealthyCount  = components.filter((c) => c.status === 'Unhealthy').length;

  const timedComponents = components.filter((c) => c.responseTimeMs > 0);
  const avgMs = timedComponents.length > 0
    ? Math.round(timedComponents.reduce((s, c) => s + c.responseTimeMs, 0) / timedComponents.length)
    : 0;

  const barData = timedComponents.map((c) => ({
    name: c.name,
    ms: c.responseTimeMs,
    status: c.status,
  }));

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-indigo-400">{t('nav_dashboard')}</Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">{group.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{group.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{components.length} {t('components_monitored')}</p>
        </div>
        <StatusBadge status={overallStatus} size="md" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title={t('stat_healthy')}   value={healthyCount}   accent="green" />
        <StatCard title={t('stat_degraded')}  value={degradedCount}  accent={degradedCount  > 0 ? 'amber' : 'slate'} />
        <StatCard title={t('stat_unhealthy')} value={unhealthyCount} accent={unhealthyCount > 0 ? 'red'   : 'slate'} />
        <StatCard
          title={t('avg_latency')}
          value={avgMs > 0 ? `${avgMs} ms` : '—'}
          sub={timedComponents.length > 0
            ? t('across_probes', { n: timedComponents.length })
            : t('no_timed_probes')}
          accent={avgMs > 2000 ? 'amber' : avgMs > 0 ? 'green' : 'slate'}
        />
      </div>

      {/* Response time chart */}
      {barData.length > 0 && (
        <div className="bg-navy-800 rounded-xl border border-navy-600 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('chart_response_per')}</h2>
          <ResponseBarChart data={barData} layout="vertical" />
        </div>
      )}

      {/* Component list */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          {t('components_section')}
        </h2>
        <div className="space-y-2">
          {components.map((c) => (
            <StatusCard key={c.id} component={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
