'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import clsx from 'clsx';
import type { ComponentStatus, StatusResponse } from '@/lib/types';
import { groupSlug, worstStatus } from '@/lib/utils';
import { useLang } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

const DOT: Record<ComponentStatus, string> = {
  Healthy:     'bg-green-500',
  Degraded:    'bg-amber-400',
  Unhealthy:   'bg-red-500',
  Maintenance: 'bg-blue-400',
  Unknown:     'bg-slate-500',
};

interface Result {
  id: string;
  label: string;
  sub: string;
  href: string;
  status?: ComponentStatus;
  kind: 'nav' | 'group' | 'component';
}

export default function CommandPalette() {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const { t } = useLang();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const { data } = useSWR<StatusResponse>(
    '/api/status',
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  const STATIC_LINKS: Result[] = [
    { id: 'dashboard', label: t('nav_dashboard'), sub: 'Overview',         href: '/',          kind: 'nav' },
    { id: 'incidents', label: t('nav_incidents'), sub: 'Incident history', href: '/incidents', kind: 'nav' },
    { id: 'admin',     label: t('nav_admin'),     sub: 'Component config', href: '/admin',     kind: 'nav' },
  ];

  const results: Result[] = (() => {
    const groups: Result[] = (data?.groups ?? []).map((g) => ({
      id: `group-${g.name}`,
      label: g.name,
      sub: `${g.components.length} ${t('components_section').toLowerCase()}`,
      href: `/category/${groupSlug(g.name)}`,
      status: worstStatus(g.components.map((c) => c.status)) as ComponentStatus,
      kind: 'group',
    }));

    const components: Result[] = (data?.groups ?? []).flatMap((g) =>
      g.components.map((c) => ({
        id: c.id,
        label: c.name,
        sub: g.name,
        href: `/components/${c.id}`,
        status: c.status as ComponentStatus,
        kind: 'component',
      }))
    );

    const all = [...STATIC_LINKS, ...groups, ...components];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(
      (r) => r.label.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q)
    );
  })();

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) navigate(results[activeIdx].href);
  }

  if (!open) return null;

  const panel = dark
    ? 'bg-navy-800 border-navy-500'
    : 'bg-white border-gray-200 shadow-xl';
  const inputRow = dark ? 'border-navy-600' : 'border-gray-100';
  const inputText = dark ? 'text-slate-100 placeholder-slate-500' : 'text-gray-900 placeholder-gray-400';
  const resultHover = dark ? 'hover:bg-navy-750' : 'hover:bg-gray-50';
  const resultActive = dark ? 'bg-navy-700' : 'bg-indigo-50';
  const subText = dark ? 'text-slate-500' : 'text-gray-400';
  const mainText = dark ? 'text-slate-200' : 'text-gray-800';
  const pagePill = dark ? 'text-slate-600 bg-navy-900' : 'text-gray-400 bg-gray-100';
  const footerRow = dark ? 'border-navy-600 text-slate-600' : 'border-gray-100 text-gray-400';
  const emptyText = dark ? 'text-slate-500' : 'text-gray-400';

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery(''); }} />

      {/* Panel */}
      <div className={clsx('relative w-full max-w-xl border rounded-2xl overflow-hidden', panel)}>
        {/* Search input */}
        <div className={clsx('flex items-center gap-3 px-4 py-3 border-b', inputRow)}>
          <svg className={clsx('h-4 w-4 shrink-0', dark ? 'text-slate-500' : 'text-gray-400')} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.65 10.65z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search_components')}
            className={clsx('flex-1 bg-transparent text-sm outline-none', inputText)}
          />
          <kbd className={clsx('hidden sm:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono', dark ? 'border-navy-500 text-slate-500' : 'border-gray-200 text-gray-400')}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className={clsx('px-4 py-6 text-center text-sm', emptyText)}>{t('cmd_no_results')}</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => navigate(r.href)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === activeIdx ? resultActive : resultHover
                )}
              >
                {r.status ? (
                  <span className={clsx('h-2 w-2 rounded-full shrink-0', DOT[r.status])} />
                ) : (
                  <span className={clsx('h-2 w-2 rounded-full shrink-0', dark ? 'bg-slate-600' : 'bg-gray-300')} />
                )}
                <div className="min-w-0">
                  <p className={clsx('text-sm truncate', mainText)}>{r.label}</p>
                  <p className={clsx('text-xs truncate', subText)}>{r.sub}</p>
                </div>
                {r.kind === 'nav' && (
                  <span className={clsx('ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0', pagePill)}>
                    {t('cmd_page')}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className={clsx('border-t px-4 py-2 flex gap-4 text-[10px]', footerRow)}>
          <span><kbd className="font-mono">↑↓</kbd> {t('cmd_navigate')}</span>
          <span><kbd className="font-mono">↵</kbd> {t('cmd_open')}</span>
          <span><kbd className="font-mono">Esc</kbd> {t('cmd_close')}</span>
        </div>
      </div>
    </div>
  );
}
