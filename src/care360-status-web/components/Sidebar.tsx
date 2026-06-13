'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import clsx from 'clsx';
import type { ComponentStatus, StatusResponse } from '@/lib/types';
import { groupSlug, worstStatus } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import { useLang } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

const DOT: Record<ComponentStatus, string> = {
  Healthy:     'bg-green-400',
  Degraded:    'bg-amber-400',
  Unhealthy:   'bg-red-500',
  Maintenance: 'bg-blue-400',
  Unknown:     'bg-slate-500',
};

function NavLink({
  href,
  children,
  dot,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  dot?: ComponentStatus;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        active
          ? 'bg-navy-600 text-white font-semibold'
          : 'text-slate-300 hover:bg-navy-700 hover:text-white'
      )}
    >
      {dot && (
        <span className={clsx('h-2 w-2 rounded-full shrink-0', DOT[dot])} />
      )}
      {children}
    </Link>
  );
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { data } = useSWR<StatusResponse>(
    '/api/status',
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 60_000 }
  );
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();

  const groups = data?.groups ?? [];
  const overall = data?.overall as ComponentStatus | undefined;

  const overallText =
    overall === 'Healthy'  ? t('status_healthy_short') :
    overall === 'Degraded' ? t('status_degraded_short') :
    overall === 'Unhealthy'? t('status_unhealthy_short') :
    overall ?? '—';

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-navy-600">
        <p className="text-white font-bold text-lg leading-tight">Rapid360</p>
        <p className="text-slate-400 text-xs mt-0.5">System Status</p>
      </div>

      {/* Search — prominent position right below logo */}
      <div className="px-3 py-3 border-b border-navy-600">
        <button
          onClick={() => {
            if (onClose) onClose();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 bg-navy-800 border border-navy-500 hover:border-navy-400 hover:text-slate-200 transition-colors"
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.65 10.65z" />
          </svg>
          <span className="flex-1 text-left">{t('nav_search_placeholder')}</span>
          <kbd className="font-mono text-[10px] border border-navy-400 rounded px-1 opacity-60">{t('nav_search_shortcut')}</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink href="/" onClick={onClose}>
          <span className="mr-1">📊</span> {t('nav_dashboard')}
        </NavLink>

        {groups.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 pt-4 pb-1">
              {t('nav_services')}
            </p>
            {groups.map((g) => {
              const status = worstStatus(g.components.map((c) => c.status));
              return (
                <NavLink
                  key={g.name}
                  href={`/category/${groupSlug(g.name)}`}
                  dot={status}
                  onClick={onClose}
                >
                  {g.name}
                </NavLink>
              );
            })}
          </>
        )}

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 pt-4 pb-1">
          {t('nav_more')}
        </p>
        <NavLink href="/incidents" onClick={onClose}>
          <span className="mr-1">📋</span> {t('nav_incidents')}
        </NavLink>
        <NavLink href="/admin" onClick={onClose}>
          <span className="mr-1">⚙️</span> {t('nav_admin')}
        </NavLink>
      </nav>

      {/* Footer: status + controls */}
      <div className="px-3 py-3 border-t border-navy-600 space-y-2.5">
        {/* Overall status */}
        {data && (
          <div className="flex items-center gap-2 px-1">
            <span className={clsx('h-2.5 w-2.5 rounded-full shrink-0', DOT[overall as ComponentStatus] ?? DOT.Unknown)} />
            <span className="text-xs text-slate-400 truncate">{overallText}</span>
          </div>
        )}

        {/* Controls row */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('theme_light') : t('theme_dark')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-navy-700 hover:text-slate-200 transition-colors border border-navy-600"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            <span>{theme === 'dark' ? t('theme_light') : t('theme_dark')}</span>
          </button>

          {/* Language toggle */}
          <div className="flex ml-auto rounded-lg overflow-hidden border border-navy-600">
            {(['en', 'tr'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={clsx(
                  'px-2.5 py-1.5 text-xs font-medium transition-colors',
                  lang === l
                    ? 'bg-navy-600 text-white'
                    : 'text-slate-400 hover:bg-navy-700 hover:text-slate-200'
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Mobile top bar ──────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-navy-950 border-b border-navy-600 px-4 h-14 flex items-center justify-between">
        <div>
          <span className="text-white font-bold">Rapid360</span>
          <span className="text-slate-400 text-xs ml-2">Status</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-slate-300 hover:text-white p-1.5 rounded"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-56 bg-navy-950 z-20">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-navy-950 z-50 md:hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 h-14 border-b border-navy-600">
              <span className="text-white font-bold">Rapid360</span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-300 hover:text-white p-1.5 rounded"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">
              <SidebarContent onClose={() => setOpen(false)} />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
