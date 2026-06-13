'use client';

import { useId } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { HistoryPoint } from '@/lib/types';
import { useTheme } from '@/lib/theme';

function CustomTooltip({ active, payload, label, dark }: any) {
  if (!active || !payload?.length || payload[0].value === null) return null;
  return (
    <div style={{
      background: dark ? '#0d1b2e' : '#ffffff',
      border: `1px solid ${dark ? '#1e3a5c' : '#e2e8f0'}`,
      borderRadius: 8,
      padding: '8px 12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    }}>
      <p style={{ color: dark ? '#64748b' : '#94a3b8', fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#818cf8', fontSize: 14, fontWeight: 700 }}>
        {payload[0].value} ms
      </p>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  series: HistoryPoint[];
  degradedMs?: number;
  unhealthyMs?: number;
}

export default function LatencyChart({ series, degradedMs = 2000, unhealthyMs = 10000 }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const GRID_COLOR = dark ? '#1a304e' : '#e2e8f0';
  const TICK_COLOR = dark ? '#475569' : '#94a3b8';

  if (series.length === 0)
    return <p className="text-sm text-slate-500 py-8 text-center">No data yet</p>;

  const data = [...series]
    .reverse()
    .map((p) => ({
      t: fmt(p.checkedAt),
      ms: p.responseTimeMs || null,
      status: p.status,
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`latGrad${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={dark ? 0.35 : 0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 11, fill: TICK_COLOR }}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: TICK_COLOR }}
          tickFormatter={(v) => `${v} ms`}
          width={60}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip dark={dark} />} cursor={{ stroke: dark ? '#1e3a5c' : '#e2e8f0', strokeWidth: 1 }} />
        {degradedMs > 0 && (
          <ReferenceLine
            y={degradedMs} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5}
            label={{ value: 'Degraded', fontSize: 10, fill: '#f59e0b', position: 'right' }}
          />
        )}
        {unhealthyMs > 0 && unhealthyMs < 30000 && (
          <ReferenceLine
            y={unhealthyMs} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5}
            label={{ value: 'Unhealthy', fontSize: 10, fill: '#ef4444', position: 'right' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="ms"
          stroke="#818cf8"
          strokeWidth={2.5}
          fill={`url(#latGrad${uid})`}
          dot={false}
          activeDot={{ r: 5, fill: '#818cf8', stroke: dark ? '#0d1b2e' : '#ffffff', strokeWidth: 2 }}
          isAnimationActive={false}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
