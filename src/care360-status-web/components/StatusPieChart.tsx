'use client';

import { useId, useState } from 'react';
import clsx from 'clsx';
import type { ComponentStatus } from '@/lib/types';
import { useTheme } from '@/lib/theme';
import { useLang } from '@/lib/i18n';
import type { TKey } from '@/lib/i18n';

// ── Color palette ─────────────────────────────────────────────────────────────
const C: Record<string, { solid: string; lite: string }> = {
  Healthy:     { solid: '#22c55e', lite: '#4ade80' },
  Degraded:    { solid: '#f59e0b', lite: '#fbbf24' },
  Unhealthy:   { solid: '#ef4444', lite: '#f87171' },
  Maintenance: { solid: '#3b82f6', lite: '#60a5fa' },
  Unknown:     { solid: '#64748b', lite: '#94a3b8' },
};

// ── Geometry helpers ──────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, start: number, end: number) {
  const [ox1, oy1] = polar(cx, cy, outerR, start);
  const [ox2, oy2] = polar(cx, cy, outerR, end);
  const [ix1, iy1] = polar(cx, cy, innerR, start);
  const [ix2, iy2] = polar(cx, cy, innerR, end);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  data: { name: ComponentStatus; value: number }[];
}

export default function StatusPieChart({ data }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hovered, setHovered] = useState<number | null>(null);
  const { theme } = useTheme();
  const { t } = useLang();
  const dark = theme === 'dark';
  const labelFor = (name: string) => t((`badge_${name}`) as TKey);
  const trackStroke  = dark ? '#1a304e' : '#e2e8f0';
  const segStroke    = dark ? '#0d1b2e' : '#ffffff';
  const centerFill   = dark ? '#102035' : '#ffffff';
  const totalFill    = dark ? '#e2e8f0' : '#0f172a';
  const labelFill    = dark ? '#475569' : '#94a3b8';

  const filtered = data.filter((d) => d.value > 0);
  const total    = filtered.reduce((s, d) => s + d.value, 0);

  if (filtered.length === 0 || total === 0)
    return <p className="text-sm text-slate-500 text-center py-8">No data</p>;

  // Chart geometry
  const cx = 84, cy = 84, outerR = 74, innerR = 48, gap = 1.8;

  // Build segment angles
  let cum = 0;
  const segs = filtered.map((d) => {
    const span  = (d.value / total) * 360;
    const start = cum + gap;
    const end   = cum + span - gap;
    const mid   = cum + span / 2;
    cum += span;
    return { ...d, start, end, mid };
  });

  // Active segment info
  const activeSeg  = hovered !== null ? segs[hovered]   : null;
  const activeColor = activeSeg ? (C[activeSeg.name] ?? C.Unknown) : null;

  return (
    <div className="flex items-center gap-5">
      {/* ── Donut SVG ──────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <svg width={168} height={168} viewBox="0 0 168 168" style={{ overflow: 'visible' }}>
          <defs>
            {segs.map((s) => {
              const col = C[s.name] ?? C.Unknown;
              return (
                <radialGradient key={s.name} id={`rg-${s.name}-${uid}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor={col.lite} stopOpacity={1}    />
                  <stop offset="100%" stopColor={col.solid} stopOpacity={0.85} />
                </radialGradient>
              );
            })}
          </defs>

          {/* Background track ring */}
          <circle
            cx={cx} cy={cy}
            r={(outerR + innerR) / 2}
            fill="none"
            stroke={trackStroke}
            strokeWidth={outerR - innerR + 2}
          />

          {/* Segments */}
          {segs.map((s, i) => {
            const col     = C[s.name] ?? C.Unknown;
            const isHov   = hovered === i;
            // Lift hovered sector outward along its midpoint angle
            const rad     = (s.mid - 90) * (Math.PI / 180);
            const lift    = isHov ? 7 : 0;
            const tx      = Math.cos(rad) * lift;
            const ty      = Math.sin(rad) * lift;
            return (
              <path
                key={s.name}
                d={arcPath(cx, cy, outerR, innerR, s.start, s.end)}
                fill={`url(#rg-${s.name}-${uid})`}
                stroke={segStroke}
                strokeWidth={1.5}
                transform={`translate(${tx.toFixed(2)}, ${ty.toFixed(2)})`}
                style={{
                  filter: isHov ? `drop-shadow(0 0 8px ${col.solid}cc)` : 'none',
                  transition: 'transform 0.2s ease, filter 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {/* Center hole fill */}
          <circle cx={cx} cy={cy} r={innerR - 2} fill={centerFill} />

          {/* Center text */}
          {activeSeg ? (
            <>
              <text x={cx} y={cy - 8} textAnchor="middle" fill={totalFill}
                fontSize={26} fontWeight={700} fontFamily="inherit">
                {activeSeg.value}
              </text>
              <text x={cx} y={cy + 13} textAnchor="middle"
                fill={activeColor?.solid ?? '#94a3b8'} fontSize={11} fontFamily="inherit">
                {labelFor(activeSeg.name)}
              </text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 8} textAnchor="middle" fill={totalFill}
                fontSize={26} fontWeight={700} fontFamily="inherit">
                {total}
              </text>
              <text x={cx} y={cy + 13} textAnchor="middle" fill={labelFill}
                fontSize={11} fontFamily="inherit">
                {t('pie_components')}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {segs.map((s, i) => {
          const col = C[s.name] ?? C.Unknown;
          const pct = Math.round((s.value / total) * 100);
          return (
            <div
              key={s.name}
              className={clsx(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-default transition-colors',
                hovered === i ? 'bg-navy-700' : 'hover:bg-navy-750'
              )}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Color swatch */}
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: col.solid, boxShadow: hovered === i ? `0 0 6px ${col.solid}` : 'none' }}
              />
              <span className="text-xs text-slate-300 flex-1 truncate">{labelFor(s.name)}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: col.solid }}>{s.value}</span>
              <span className="text-[11px] text-slate-600 tabular-nums w-7 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
