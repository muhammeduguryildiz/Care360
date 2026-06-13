import type { ComponentConfig, HistoryResponse, Incident, StatusResponse } from './types';

const BASE = '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  getStatus: () => apiFetch<StatusResponse>('/status'),
  getHistory: (id: string, range = '7d') =>
    apiFetch<HistoryResponse>(`/components/${encodeURIComponent(id)}/history?range=${range}`),
  getIncidents: () => apiFetch<Incident[]>('/incidents'),

  // Admin
  getComponents: () => apiFetch<ComponentConfig[]>('/admin/components'),
  createComponent: (body: Partial<ComponentConfig>) =>
    apiFetch<ComponentConfig>('/admin/components', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  updateComponent: (id: string, body: Partial<ComponentConfig>) =>
    apiFetch<ComponentConfig>(`/admin/components/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  deleteComponent: (id: string) =>
    apiFetch<void>(`/admin/components/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  createIncident: (body: Partial<Incident>) =>
    apiFetch<Incident>('/admin/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  resolveIncident: (month: string, rowKey: string) =>
    apiFetch<Incident>(`/admin/incidents/${month}/${encodeURIComponent(rowKey)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentStatus: 'resolved' }),
    }),
};

export const swrFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });
