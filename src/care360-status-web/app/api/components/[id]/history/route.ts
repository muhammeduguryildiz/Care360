import { NextResponse } from 'next/server';

// Deterministic pseudo-random — same component+index always gives same value
function rand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// Stable seed per component ID
function componentSeed(id: string): number {
  return id.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
}

interface Profile {
  base: number;
  jitter: number;
  kind: 'http' | 'sql' | 'metric';
}

const PROFILES: Record<string, Profile> = {
  'fno-prod':            { base: 892,  jitter: 200, kind: 'http'   },
  'fno-exceptions':      { base: 0,    jitter: 0,   kind: 'metric' },
  'fno-batch':           { base: 0,    jitter: 0,   kind: 'metric' },
  'crm-api':             { base: 145,  jitter: 60,  kind: 'http'   },
  'erp-connector':       { base: 160,  jitter: 80,  kind: 'http'   },
  'logistics-api':       { base: 212,  jitter: 90,  kind: 'http'   },
  'payment-gateway':     { base: 390,  jitter: 120, kind: 'http'   },
  'ecommerce-api':       { base: 178,  jitter: 70,  kind: 'http'   },
  'deploy-pipeline':     { base: 0,    jitter: 0,   kind: 'metric' },
  'integration-pipeline':{ base: 0,    jitter: 0,   kind: 'metric' },
  'byod-sql':            { base: 23,   jitter: 8,   kind: 'sql'    },
  'integration-bus':     { base: 0,    jitter: 0,   kind: 'metric' },
};

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const url = new URL(req.url);
  const range = url.searchParams.get('range') ?? '7d';
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;

  const profile = PROFILES[id] ?? { base: 200, jitter: 100, kind: 'http' as const };
  const seed = componentSeed(id);
  const now = Date.now();

  // One probe point per hour across the selected range
  const intervalMs = 60 * 60_000;
  const count = days * 24;

  const series = Array.from({ length: count }, (_, i) => {
    const checkedAt = new Date(now - i * intervalMs).toISOString();
    const r1 = rand(seed * 1000 + i);
    const r2 = rand(seed * 1000 + i + 777);

    let status: string;
    let responseTimeMs: number;
    let message: string;

    // erp-connector: degraded for the last 10 hours (current active incident)
    if (id === 'erp-connector' && i < 10) {
      const ms = 2800 + Math.floor(r2 * 800);
      status = 'Degraded';
      responseTimeMs = ms;
      message = `Response slow (${ms} ms) — threshold 2000 ms`;
    }
    // integration-pipeline: maintenance for last 3 hours, then healthy
    else if (id === 'integration-pipeline' && i < 3) {
      status = 'Maintenance';
      responseTimeMs = 0;
      message = 'Maintenance window — pipeline paused';
    }
    // fno-prod: simulate PU73 maintenance ~7 days ago (a 3-hour window)
    else if (id === 'fno-prod' && i >= 7 * 24 - 2 && i <= 7 * 24) {
      status = 'Maintenance';
      responseTimeMs = 0;
      message = 'Microsoft platform update PU73 in progress';
    }
    // fno-batch: a single 2-hour batch deadlock ~35 days ago (only visible in 30d/90d)
    else if (id === 'fno-batch' && days >= 30 && i >= 35 * 24 && i < 35 * 24 + 2) {
      status = 'Unhealthy';
      responseTimeMs = 0;
      message = 'Batch scheduler deadlock — DMF jobs not processing';
    }
    // logistics-api: 3-hour outage ~85 days ago (only visible in 90d)
    else if (id === 'logistics-api' && days >= 90 && i >= 85 * 24 && i < 85 * 24 + 3) {
      status = 'Unhealthy';
      responseTimeMs = 0;
      message = 'Vendor datacenter networking fault';
    }
    // generic: rare blips
    else if (r1 < 0.004) {
      status = 'Unhealthy';
      responseTimeMs = 0;
      message = 'Connection timeout';
    }
    else if (r1 < 0.02) {
      const ms = Math.floor(profile.base * 2.5 + r2 * profile.jitter * 3);
      status = 'Degraded';
      responseTimeMs = profile.kind !== 'metric' ? ms : 0;
      message = profile.kind !== 'metric' ? `Response slow (${ms} ms)` : 'Metric elevated';
    }
    else {
      const ms = Math.floor(profile.base + (r2 - 0.5) * profile.jitter);
      status = 'Healthy';
      responseTimeMs = profile.kind !== 'metric' ? Math.max(8, ms) : 0;
      message = profile.kind === 'http' ? `HTTP 200 in ${responseTimeMs} ms`
              : profile.kind === 'sql'  ? `SQL ping ${responseTimeMs} ms`
              : 'Nominal';
    }

    return { checkedAt, status, responseTimeMs, message };
  });

  const healthyCount = series.filter((s) => s.status === 'Healthy').length;
  const uptimePercent = Math.round((healthyCount / series.length) * 10000) / 100;

  return NextResponse.json({ componentId: id, range, uptimePercent, series });
}
