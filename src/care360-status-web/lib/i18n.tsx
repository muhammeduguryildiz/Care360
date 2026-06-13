'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'tr';

export const TRANSLATIONS = {
  en: {
    nav_dashboard: 'Dashboard',
    nav_services: 'Services',
    nav_incidents: 'Incidents',
    nav_admin: 'Admin',
    nav_search_placeholder: 'Search…',
    nav_search_shortcut: 'Ctrl K',
    nav_more: 'More',

    status_healthy_short: 'All systems operational',
    status_degraded_short: 'Partial disruption',
    status_unhealthy_short: 'Service outage',

    badge_Healthy: 'Operational',
    badge_Degraded: 'Degraded',
    badge_Unhealthy: 'Outage',
    badge_Maintenance: 'Maintenance',
    badge_Unknown: 'Unknown',

    inc_investigating: 'Investigating',
    inc_identified: 'Identified',
    inc_monitoring: 'Monitoring',
    inc_resolved: 'Resolved',

    current_status: 'Current Status',
    last_updated: 'Last updated',
    components_monitored: 'components monitored',
    overall_healthy: 'All Systems Operational',
    overall_degraded: 'Partial Service Disruption',
    overall_unhealthy: 'Service Outage Detected',
    overall_maintenance: 'Scheduled Maintenance',
    overall_unknown: 'Status Unknown',
    stat_total: 'Total Components',
    stat_healthy: 'Healthy',
    stat_issues: 'Issues',
    stat_incidents: 'Active Incidents',
    tap_to_view: 'tap to view',
    chart_distribution: 'Status Distribution',
    chart_response: 'Avg Response Time by Group',
    no_latency: 'No latency data (non-HTTP probes only)',
    service_groups: 'Service Groups',
    components_healthy: 'components healthy',
    active_incidents_section: 'Active Incidents',
    view_all: 'View all →',
    operational_pct: '% operational',
    degraded_count: 'degraded',
    down_count: 'down',

    incident_history: 'Incident History',
    stat_total_90: 'Total (90 d)',
    stat_active: 'Active',
    stat_mttr: 'MTTR',
    stat_longest: 'Longest incident',
    chart_per_month: 'Incidents per month',
    no_incidents: 'No incidents in the last 3 months',
    no_incidents_sub: 'All systems have been operating normally.',
    inc_started: 'Started:',
    inc_resolved_at: 'Resolved:',
    inc_ttr: 'TTR:',
    inc_affected: 'Affected:',
    incidents_unit: 'incidents',
    loading: 'Loading…',

    back_to_dashboard: '← Dashboard',
    stat_degraded: 'Degraded',
    stat_unhealthy: 'Unhealthy',
    avg_latency: 'Avg Latency',
    across_probes: 'across {n} HTTP probes',
    no_timed_probes: 'no timed probes',
    chart_response_per: 'Response Time per Component',
    components_section: 'Components',

    back_to_status: '← Back to status',
    last_checked: 'Last checked',
    uptime_label: 'Uptime ({range})',
    total_checks: 'Total checks',
    last_latency: 'Last latency',
    uptime_bar: '90-day uptime',
    latency_history: 'Latency history',
    no_data_yet: 'No data yet',
    table_time: 'Time',
    table_status: 'Status',
    table_latency: 'Latency',
    table_message: 'Message',

    admin_title: 'Admin',
    components_label: 'Components',
    add_component: '+ Add component',
    new_component: 'New component',
    edit_component: 'Edit: {name}',
    no_components: 'No components yet.',
    col_id: 'ID',
    col_type: 'Type',
    col_group: 'Group',
    col_enabled: 'Enabled',
    btn_edit: 'Edit',
    btn_delete: 'Delete',
    btn_cancel: 'Cancel',
    btn_save: 'Save',
    btn_saving: 'Saving…',
    field_id: 'Component ID *',
    field_name: 'Display Name *',
    field_probe: 'Probe Type *',
    field_group: 'Group',
    field_interval: 'Interval (seconds)',
    field_enabled: 'Enabled',
    field_params: 'Params (JSON)',
    admin_incidents: 'Active Incidents',
    btn_post_incident: '+ Post incident',
    btn_resolve: 'Resolve',
    no_active_incidents: 'No active incidents',
    field_title: 'Title *',
    field_severity: 'Severity',
    field_details: 'Details',
    btn_post: 'Post Incident',
    btn_posting: 'Posting…',

    search_components: 'Search components, groups…',
    cmd_navigate: 'navigate',
    cmd_open: 'open',
    cmd_close: 'close',
    cmd_no_results: 'No results',
    cmd_page: 'page',

    footer_powered: 'Powered by Azure & D365 F&O — data refreshes every 60 s',
    theme_dark: 'Dark',
    theme_light: 'Light',

    severity_minor: 'Minor',
    severity_major: 'Major',
    severity_critical: 'Critical',
    severity_maintenance: 'Maintenance',

    range_7d: '7 days',
    range_30d: '30 days',
    range_90d: '90 days',

    pie_components: 'components',
    uptime_short: 'uptime',
    ago_s: '{n}s ago',
    ago_m: '{n}m ago',
    ago_h: '{n}h ago',
  },
  tr: {
    nav_dashboard: 'Panel',
    nav_services: 'Servisler',
    nav_incidents: 'Olaylar',
    nav_admin: 'Yönetim',
    nav_search_placeholder: 'Ara…',
    nav_search_shortcut: 'Ctrl K',
    nav_more: 'Diğer',

    status_healthy_short: 'Tüm sistemler çalışıyor',
    status_degraded_short: 'Kısmi aksama',
    status_unhealthy_short: 'Hizmet kesintisi',

    badge_Healthy: 'Çalışıyor',
    badge_Degraded: 'Sorunlu',
    badge_Unhealthy: 'Kesinti',
    badge_Maintenance: 'Bakımda',
    badge_Unknown: 'Bilinmiyor',

    inc_investigating: 'Araştırılıyor',
    inc_identified: 'Tespit Edildi',
    inc_monitoring: 'İzleniyor',
    inc_resolved: 'Çözüldü',

    current_status: 'Güncel Durum',
    last_updated: 'Son güncelleme',
    components_monitored: 'bileşen izleniyor',
    overall_healthy: 'Tüm Sistemler Çalışıyor',
    overall_degraded: 'Kısmi Hizmet Kesintisi',
    overall_unhealthy: 'Hizmet Kesintisi Tespit Edildi',
    overall_maintenance: 'Planlı Bakım',
    overall_unknown: 'Durum Bilinmiyor',
    stat_total: 'Toplam Bileşen',
    stat_healthy: 'Sağlıklı',
    stat_issues: 'Sorunlar',
    stat_incidents: 'Aktif Olaylar',
    tap_to_view: 'görüntüle',
    chart_distribution: 'Durum Dağılımı',
    chart_response: 'Gruba Göre Ort. Yanıt Süresi',
    no_latency: 'Gecikme verisi yok (yalnızca HTTP olmayan problar)',
    service_groups: 'Servis Grupları',
    components_healthy: 'bileşen sağlıklı',
    active_incidents_section: 'Aktif Olaylar',
    view_all: 'Tümünü gör →',
    operational_pct: '% çalışıyor',
    degraded_count: 'sorunlu',
    down_count: 'çevrimdışı',

    incident_history: 'Olay Geçmişi',
    stat_total_90: 'Toplam (90 g)',
    stat_active: 'Aktif',
    stat_mttr: 'OÇS',
    stat_longest: 'En Uzun Olay',
    chart_per_month: 'Aylık Olaylar',
    no_incidents: 'Son 3 ayda olay yok',
    no_incidents_sub: 'Tüm sistemler normal çalışmaktadır.',
    inc_started: 'Başlangıç:',
    inc_resolved_at: 'Çözüldü:',
    inc_ttr: 'ÇS:',
    inc_affected: 'Etkilenen:',
    incidents_unit: 'olay',
    loading: 'Yükleniyor…',

    back_to_dashboard: '← Panel',
    stat_degraded: 'Sorunlu',
    stat_unhealthy: 'Çevrimdışı',
    avg_latency: 'Ort. Gecikme',
    across_probes: '{n} HTTP probunda',
    no_timed_probes: 'zamanlı prob yok',
    chart_response_per: 'Bileşen Bazında Yanıt Süresi',
    components_section: 'Bileşenler',

    back_to_status: '← Duruma Dön',
    last_checked: 'Son kontrol',
    uptime_label: 'Çalışma Süresi ({range})',
    total_checks: 'Toplam Kontrol',
    last_latency: 'Son Gecikme',
    uptime_bar: '90 günlük çalışma',
    latency_history: 'Gecikme Geçmişi',
    no_data_yet: 'Henüz veri yok',
    table_time: 'Zaman',
    table_status: 'Durum',
    table_latency: 'Gecikme',
    table_message: 'Mesaj',

    admin_title: 'Yönetim',
    components_label: 'Bileşenler',
    add_component: '+ Bileşen ekle',
    new_component: 'Yeni bileşen',
    edit_component: 'Düzenle: {name}',
    no_components: 'Henüz bileşen yok.',
    col_id: 'ID',
    col_type: 'Tür',
    col_group: 'Grup',
    col_enabled: 'Etkin',
    btn_edit: 'Düzenle',
    btn_delete: 'Sil',
    btn_cancel: 'İptal',
    btn_save: 'Kaydet',
    btn_saving: 'Kaydediliyor…',
    field_id: 'Bileşen ID *',
    field_name: 'Görünen Ad *',
    field_probe: 'Prob Türü *',
    field_group: 'Grup',
    field_interval: 'Aralık (saniye)',
    field_enabled: 'Etkin',
    field_params: 'Parametreler (JSON)',
    admin_incidents: 'Aktif Olaylar',
    btn_post_incident: '+ Olay bildir',
    btn_resolve: 'Çözüldü',
    no_active_incidents: 'Aktif olay yok',
    field_title: 'Başlık *',
    field_severity: 'Önem Derecesi',
    field_details: 'Detaylar',
    btn_post: 'Olay Bildir',
    btn_posting: 'Gönderiliyor…',

    search_components: 'Bileşen, grup ara…',
    cmd_navigate: 'gezin',
    cmd_open: 'aç',
    cmd_close: 'kapat',
    cmd_no_results: 'Sonuç yok',
    cmd_page: 'sayfa',

    footer_powered: 'Azure & D365 F&O altyapısı — veriler 60 saniyede bir güncellenir',
    theme_dark: 'Koyu',
    theme_light: 'Açık',

    severity_minor: 'Düşük',
    severity_major: 'Yüksek',
    severity_critical: 'Kritik',
    severity_maintenance: 'Bakım',

    range_7d: '7 gün',
    range_30d: '30 gün',
    range_90d: '90 gün',

    pie_components: 'bileşen',
    uptime_short: 'çalışma',
    ago_s: '{n}sn önce',
    ago_m: '{n}dk önce',
    ago_h: '{n}sa önce',
  },
} as const;

export type TKey = keyof typeof TRANSLATIONS.en;

const LangCtx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}>({
  lang: 'tr',
  setLang: () => {},
  t: (key) => String(key),
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('tr');

  useEffect(() => {
    const saved = localStorage.getItem('care360-lang') as Lang | null;
    if (saved === 'en' || saved === 'tr') setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('care360-lang', l);
  };

  const t = (key: TKey, vars?: Record<string, string | number>): string => {
    let str: string = (TRANSLATIONS[lang] as Record<string, string>)[key] ?? (TRANSLATIONS.en as Record<string, string>)[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </LangCtx.Provider>
  );
}

export const useLang = () => useContext(LangCtx);
