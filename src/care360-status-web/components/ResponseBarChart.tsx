'use client';

import { useId } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/lib/theme';

interface DataPoint {
  name: string;
  ms: number;
  status: string;
}

const GRADIENTS: Record<string, [string, string]> = {
  Healthy:     ['#4ade80', '#16a34a'],
  Degraded:    ['#fbbf24', '#b45309'],
  Unhealthy:   ['#f87171', '#b91c1c'],
  Maintenance: ['#60a5fa', '#1d4ed8'],
  Unknown:     ['#94a3b8', '#475569'],
};

function CustomTooltip({ active, payload, label, dark }: any) {
  if (!active || !payload?.length) return null;
  const color = GRADIENTS[payload[0]?.payload?.status]?.[0] ?? '#94a3b8';
  return (
    <div style={{
      background: dark ? '#0d1b2e' : '#ffffff',
      border: `1px solid ${dark ? '#1e3a5c' : '#e2e8f0'}`,
      borderRadius: 8,
      padding: '8px 12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    }}>
      {label && <p style={{ color: dark ? '#64748b' : '#94a3b8', fontSize: 11, marginBottom: 4 }}>{label}</p>}
      <p style={{ color, fontSize: 14, fontWeight: 700 }}>
        {payload[0].value} ms
      </p>
    </div>
  );
}

interface Props {
  data: DataPoint[];
  layout?: 'horizontal' | 'vertical';
}

export default function ResponseBarChart({ data, layout = 'horizontal' }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const GRID_COLOR = dark ? '#1a304e' : '#e2e8f0';
  const TICK_COLOR = dark ? '#475569' : '#94a3b8';

  if (data.length === 0)
    return <p className="text-sm text-slate-500 text-center py-8">No data</p>;

  const gradDefs = (
    <defs>
      {Object.entries(GRADIENTS).map(([status, [from, to]]) => (
        <linearGradient
          key={status}
          id={`bg${status}${uid}`}
          x1={layout === 'vertical' ? '0' : '0'}
          y1={layout === 'vertical' ? '0' : '0'}
          x2={layout === 'vertical' ? '1' : '0'}
          y2={layout === 'vertical' ? '0' : '1'}
        >
          <stop offset="0%" stopColor={from} stopOpacity={0.95} />
          <stop offset="100%" stopColor={to} stopOpacity={0.75} />
        </linearGradient>
      ))}
    </defs>
  );

  const tooltipEl = <CustomTooltip dark={dark} />;

  if (layout === 'vertical') {
    return (
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 52)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, bottom: 4, left: 8 }}
        >
          {gradDefs}
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_COLOR} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: TICK_COLOR }}
            tickFormatter={(v) => `${v} ms`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: dark ? '#94a3b8' : '#64748b' }}
            width={130}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={tooltipEl} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="ms" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive>
            {data.map((entry, i) => (
              <Cell key={i} fill={`url(#bg${entry.status}${uid})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        {gradDefs}
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: TICK_COLOR }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: TICK_COLOR }} tickFormatter={(v) => `${v} ms`} width={58} axisLine={false} tickLine={false} />
        <Tooltip content={tooltipEl} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="ms" radius={[6, 6, 0, 0]} maxBarSize={52} isAnimationActive>
          {data.map((entry, i) => (
            <Cell key={i} fill={`url(#bg${entry.status}${uid})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
