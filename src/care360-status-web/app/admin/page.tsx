'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import clsx from 'clsx';
import type { ComponentConfig, Incident } from '@/lib/types';
import { api } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import { useLang } from '@/lib/i18n';

// ── Probe type options ────────────────────────────────────────────────────────

const PROBE_TYPES = ['http', 'fno', 'devops', 'appinsights', 'sql', 'servicebus'] as const;
const GROUP_SUGGESTIONS = ['Integrations', 'F&O Platform', 'Pipelines', 'Data Stores', 'General'];

const DEFAULT_PARAMS: Record<string, string> = {
  http: JSON.stringify({ url: 'https://example.com/health', method: 'GET', expectedStatus: 200 }, null, 2),
  fno: JSON.stringify({ environmentUrl: 'https://xxx.operations.dynamics.com', tenantId: 'YOUR_TENANT_ID', clientIdSecretRef: 'fno-client-id', clientSecretRef: 'fno-client-secret' }, null, 2),
  devops: JSON.stringify({ organization: 'myorg', project: 'myproject', definitionId: 1, patSecretRef: 'devops-pat' }, null, 2),
  appinsights: JSON.stringify({ workspaceId: 'WORKSPACE_GUID', kql: 'exceptions | where timestamp > ago(30m) | summarize value=count()', lookbackMinutes: 30, metricLabel: 'Exceptions', degradedThreshold: 5, unhealthyThreshold: 20 }, null, 2),
  sql: JSON.stringify({ connectionStringSecretRef: 'byod-sql-connstr' }, null, 2),
  servicebus: JSON.stringify({ namespaceUri: 'https://xxx.servicebus.windows.net', queueName: 'my-queue' }, null, 2),
};

const inputCls = 'mt-1 block w-full rounded border border-navy-500 bg-navy-900 text-slate-100 px-3 py-1.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500';

// ── Component form ────────────────────────────────────────────────────────────

function ComponentForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ComponentConfig;
  onSave: (data: Partial<ComponentConfig>) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<Partial<ComponentConfig>>(
    initial ?? {
      probeType: 'http',
      group: 'Integrations',
      intervalSeconds: 60,
      enabled: true,
      paramsJson: DEFAULT_PARAMS.http,
      thresholdsJson: '{}',
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof ComponentConfig>(k: K, v: ComponentConfig[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'probeType') {
      setForm((f) => ({ ...f, probeType: v as string, paramsJson: DEFAULT_PARAMS[v as string] ?? '{}' }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-400">{t('field_id')}</span>
          <input
            className={inputCls}
            value={form.componentId ?? ''}
            onChange={(e) => set('componentId', e.target.value)}
            disabled={!!initial}
            placeholder="crm-api"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">{t('field_name')}</span>
          <input
            className={inputCls}
            value={form.displayName ?? ''}
            onChange={(e) => set('displayName', e.target.value)}
            placeholder="CRM API"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">{t('field_probe')}</span>
          <select
            className={inputCls}
            value={form.probeType ?? 'http'}
            onChange={(e) => set('probeType', e.target.value)}
            disabled={!!initial}
          >
            {PROBE_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">{t('field_group')}</span>
          <input
            list="groups"
            className={inputCls}
            value={form.group ?? 'General'}
            onChange={(e) => set('group', e.target.value)}
          />
          <datalist id="groups">
            {GROUP_SUGGESTIONS.map((g) => <option key={g} value={g} />)}
          </datalist>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">{t('field_interval')}</span>
          <input
            type="number" min={30} max={3600}
            className={inputCls}
            value={form.intervalSeconds ?? 60}
            onChange={(e) => set('intervalSeconds', Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2 mt-5">
          <input
            type="checkbox"
            checked={form.enabled ?? true}
            onChange={(e) => set('enabled', e.target.checked)}
            className="h-4 w-4 rounded border-navy-500 text-indigo-600 bg-navy-900"
          />
          <span className="text-sm text-slate-300">{t('field_enabled')}</span>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-400">{t('field_params')}</span>
        <textarea
          rows={6}
          className={clsx(inputCls, 'font-mono text-xs')}
          value={form.paramsJson ?? '{}'}
          onChange={(e) => set('paramsJson', e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel}
          className="text-sm px-4 py-2 rounded border border-navy-500 text-slate-300 hover:bg-navy-700">
          {t('btn_cancel')}
        </button>
        <button type="submit" disabled={saving}
          className="text-sm px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50">
          {saving ? t('btn_saving') : t('btn_save')}
        </button>
      </div>
    </form>
  );
}

// ── Incident form ─────────────────────────────────────────────────────────────

function IncidentForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const { t } = useLang();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await api.createIncident({ title, body, severity } as Partial<Incident>);
    setSaving(false);
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-xs font-medium text-slate-400">{t('field_title')}</span>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-400">{t('field_severity')}</span>
        <select className={inputCls} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="minor">{t('severity_minor')}</option>
          <option value="major">{t('severity_major')}</option>
          <option value="critical">{t('severity_critical')}</option>
          <option value="maintenance">{t('severity_maintenance')}</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-400">{t('field_details')}</span>
        <textarea rows={3} className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel}
          className="text-sm px-4 py-2 rounded border border-navy-500 text-slate-300 hover:bg-navy-700">
          {t('btn_cancel')}
        </button>
        <button type="submit" disabled={saving}
          className="text-sm px-4 py-2 rounded bg-red-700 text-white hover:bg-red-600 disabled:opacity-50">
          {saving ? t('btn_posting') : t('btn_post')}
        </button>
      </div>
    </form>
  );
}

// ── Admin page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { t } = useLang();
  const { data: components, isLoading } = useSWR<ComponentConfig[]>(
    '/api/admin/components',
    (url: string) => fetch(url).then((r) => r.json())
  );
  const { data: incidents } = useSWR<Incident[]>(
    '/api/incidents',
    (url: string) => fetch(url).then((r) => r.json())
  );

  const [addingComponent, setAddingComponent] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentConfig | null>(null);
  const [addingIncident, setAddingIncident] = useState(false);

  async function handleCreateComponent(data: Partial<ComponentConfig>) {
    await api.createComponent(data);
    await mutate('/api/admin/components');
    setAddingComponent(false);
  }

  async function handleUpdateComponent(data: Partial<ComponentConfig>) {
    await api.updateComponent(editingComponent!.componentId, data);
    await mutate('/api/admin/components');
    setEditingComponent(null);
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete component "${id}"?`)) return;
    await api.deleteComponent(id);
    await mutate('/api/admin/components');
  }

  async function handleResolveIncident(inc: Incident) {
    const slashIdx = inc.id.indexOf('/');
    const month = inc.id.substring(0, slashIdx);
    const rowKey = inc.id.substring(slashIdx + 1);
    await api.resolveIncident(month, rowKey);
    await mutate('/api/incidents');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-8">{t('admin_title')}</h1>

      {/* Components section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">{t('components_label')}</h2>
          <button
            onClick={() => { setAddingComponent(true); setEditingComponent(null); }}
            className="text-sm px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {t('add_component')}
          </button>
        </div>

        {(addingComponent || editingComponent) && (
          <div className="rounded-lg border border-indigo-700/50 bg-indigo-950/40 p-5 mb-4">
            <h3 className="text-sm font-semibold text-indigo-300 mb-4">
              {editingComponent
                ? t('edit_component', { name: editingComponent.displayName })
                : t('new_component')}
            </h3>
            <ComponentForm
              initial={editingComponent ?? undefined}
              onSave={editingComponent ? handleUpdateComponent : handleCreateComponent}
              onCancel={() => { setAddingComponent(false); setEditingComponent(null); }}
            />
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500 animate-pulse">{t('loading')}</p>
        ) : (
          <div className="rounded-lg border border-navy-600 overflow-hidden">
            {(!components || components.length === 0) ? (
              <p className="text-sm text-slate-500 px-4 py-6 text-center">{t('no_components')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-navy-900 border-b border-navy-600">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{t('col_id')}</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">{t('col_type')}</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">{t('col_group')}</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{t('col_enabled')}</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {components.map((c) => (
                    <tr key={c.componentId} className="bg-navy-800 hover:bg-navy-750">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-200">{c.displayName}</p>
                        <p className="text-xs text-slate-500">{c.componentId}</p>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <span className="text-xs bg-navy-700 text-slate-300 px-2 py-0.5 rounded-full">
                          {c.probeType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 hidden md:table-cell">{c.group}</td>
                      <td className="px-4 py-2.5">
                        <span className={clsx(
                          'inline-block h-2 w-2 rounded-full',
                          c.enabled ? 'bg-green-500' : 'bg-slate-600'
                        )} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => { setEditingComponent(c); setAddingComponent(false); }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 mr-3">{t('btn_edit')}</button>
                        <button onClick={() => handleDelete(c.componentId)}
                          className="text-xs text-red-500 hover:text-red-400">{t('btn_delete')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* Incidents section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">{t('admin_incidents')}</h2>
          <button
            onClick={() => setAddingIncident(true)}
            className="text-sm px-3 py-1.5 rounded bg-red-700 text-white hover:bg-red-600"
          >
            {t('btn_post_incident')}
          </button>
        </div>

        {addingIncident && (
          <div className="rounded-lg border border-red-800/50 bg-red-950/40 p-5 mb-4">
            <IncidentForm
              onSave={() => { setAddingIncident(false); mutate('/api/incidents'); }}
              onCancel={() => setAddingIncident(false)}
            />
          </div>
        )}

        <div className="space-y-2">
          {(incidents ?? []).filter((i) => i.status !== 'resolved').map((inc) => (
            <div key={inc.id} className="rounded-lg border border-navy-600 bg-navy-800 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-200">{inc.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{inc.status} · {inc.severity}</p>
              </div>
              <button
                onClick={() => handleResolveIncident(inc)}
                className="text-xs text-green-400 hover:text-green-300 shrink-0 ml-4"
              >
                {t('btn_resolve')}
              </button>
            </div>
          ))}
          {(incidents ?? []).filter((i) => i.status !== 'resolved').length === 0 && (
            <p className="text-sm text-slate-500 py-4 text-center">{t('no_active_incidents')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
