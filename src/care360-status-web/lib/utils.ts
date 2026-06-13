import type { ComponentStatus } from './types';

export function groupSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function matchGroupBySlug<T extends { name: string }>(
  groups: T[],
  slug: string
): T | undefined {
  return groups.find((g) => groupSlug(g.name) === slug);
}

export function worstStatus(statuses: string[]): ComponentStatus {
  const order: ComponentStatus[] = ['Unhealthy', 'Degraded', 'Maintenance', 'Unknown', 'Healthy'];
  for (const s of order) {
    if (statuses.includes(s)) return s;
  }
  return 'Unknown';
}

export function formatMs(ms: number): string {
  if (ms === 0) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
