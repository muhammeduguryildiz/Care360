// SVG status badge — usage: <img src="/api/badge/crm-api.svg">
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const componentId = params.id.replace(/\.svg$/, '');

  // In production, fetch from /api/status and find the component.
  // In dev mock, return a placeholder "Healthy" badge.
  const STATUS_COLORS: Record<string, string> = {
    Healthy:     '#22c55e',
    Degraded:    '#f59e0b',
    Unhealthy:   '#ef4444',
    Maintenance: '#3b82f6',
    Unknown:     '#64748b',
  };

  const status = 'Healthy';
  const color  = STATUS_COLORS[status];
  const label  = componentId.replace(/-/g, ' ');

  const labelW  = Math.max(60, label.length * 6 + 20);
  const statusW = 72;
  const totalW  = labelW + statusW;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1a2e" stop-opacity=".8"/>
      <stop offset="1" stop-color="#0d1b2e" stop-opacity=".9"/>
    </linearGradient>
  </defs>
  <rect width="${totalW}" height="20" rx="4" fill="url(#s)"/>
  <rect x="${labelW}" width="${statusW}" height="20" rx="0" fill="${color}" opacity=".9"/>
  <rect x="${labelW}" width="4" height="20" fill="${color}" opacity=".9"/>
  <rect x="${labelW}" width="${statusW}" height="20" rx="4" fill="${color}" opacity=".9"/>
  <!-- mask left corners of status rect -->
  <rect x="${labelW}" width="4" height="20" fill="${color}" opacity=".9"/>
  <text x="${labelW / 2}" y="14" fill="#cbd5e1" font-size="11" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" text-anchor="middle" font-weight="600">${label}</text>
  <text x="${labelW + statusW / 2}" y="14" fill="#fff" font-size="11" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" text-anchor="middle" font-weight="700">${status}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, max-age=60',
    },
  });
}
