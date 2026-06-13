import { NextResponse } from 'next/server';

const now = Date.now();
const ago = (ms: number) => new Date(now - ms).toISOString();
const d = (days: number) => ago(days * 24 * 60 * 60_000);
const m = (mins: number) => mins * 60_000;

export async function GET() {
  return NextResponse.json([
    // ── Active ────────────────────────────────────────────────────────────────
    {
      id: '202406/active-001',
      title: 'ERP Connector elevated latency',
      body: 'We are investigating elevated response times on the ERP Connector endpoint. Response times are measuring 3000–3500 ms against a 2000 ms threshold. Other services are unaffected.',
      status: 'investigating',
      severity: 'minor',
      affectedComponents: ['erp-connector'],
      createdAt: ago(12 * 60_000),
      resolvedAt: null,
    },
    {
      id: '202406/active-002',
      title: 'Integration Sync Pipeline — scheduled maintenance window',
      body: 'The Integration Sync Pipeline is paused for a planned infrastructure update to upgrade the NuGet feed and refresh build agent images. Data sync will resume after 18:00.',
      status: 'monitoring',
      severity: 'maintenance',
      affectedComponents: ['integration-pipeline'],
      createdAt: ago(90 * 60_000),
      resolvedAt: null,
    },

    // ── Resolved ──────────────────────────────────────────────────────────────
    {
      id: '202406/resolved-001',
      title: 'Integration Sync Pipeline — build failures',
      body: 'Three consecutive pipeline builds failed due to an upstream NuGet feed outage at the package registry. Resolved by switching builds to a local cache mirror.',
      status: 'resolved',
      severity: 'major',
      affectedComponents: ['integration-pipeline'],
      createdAt: new Date(d(3)).toISOString(),
      resolvedAt: new Date(now - 3 * 24 * 60 * 60_000 + m(94)).toISOString(),
    },
    {
      id: '202405/resolved-002',
      title: 'F&O Platform — scheduled maintenance PU73',
      body: 'Microsoft applied platform update PU73. All services were restored within the 45-minute maintenance window. No data loss.',
      status: 'resolved',
      severity: 'maintenance',
      affectedComponents: ['fno-prod', 'fno-exceptions', 'fno-batch'],
      createdAt: new Date(d(7)).toISOString(),
      resolvedAt: new Date(now - 7 * 24 * 60 * 60_000 + m(45)).toISOString(),
    },
    {
      id: '202405/resolved-003',
      title: 'CRM Integration — TLS certificate renewal interruption',
      body: 'TLS certificate renewal caused a brief connectivity interruption. Certificate was rotated and connectivity fully restored within 28 minutes.',
      status: 'resolved',
      severity: 'major',
      affectedComponents: ['crm-api'],
      createdAt: new Date(d(14)).toISOString(),
      resolvedAt: new Date(now - 14 * 24 * 60 * 60_000 + m(28)).toISOString(),
    },
    {
      id: '202405/resolved-004',
      title: 'Service Bus — dead-letter queue spike',
      body: 'Poison messages accumulated in the integration queue due to a schema mismatch introduced by a deployment. Messages were purged and the schema corrected.',
      status: 'resolved',
      severity: 'minor',
      affectedComponents: ['integration-bus'],
      createdAt: new Date(d(21)).toISOString(),
      resolvedAt: new Date(now - 21 * 24 * 60 * 60_000 + m(52)).toISOString(),
    },
    {
      id: '202404/resolved-005',
      title: 'F&O Batch Health — scheduler deadlock',
      body: 'Batch scheduler deadlock caused DMF export jobs to stop processing. AOS service restart cleared the deadlock. Jobs re-queued and completed successfully.',
      status: 'resolved',
      severity: 'major',
      affectedComponents: ['fno-batch'],
      createdAt: new Date(d(35)).toISOString(),
      resolvedAt: new Date(now - 35 * 24 * 60 * 60_000 + m(120)).toISOString(),
    },
    {
      id: '202404/resolved-006',
      title: 'Payment Gateway — rate limit exceeded',
      body: 'An order volume spike pushed API call rate past the vendor\'s per-minute limit. Throttling was applied and the issue self-resolved after 18 minutes with no failed orders.',
      status: 'resolved',
      severity: 'minor',
      affectedComponents: ['payment-gateway'],
      createdAt: new Date(d(48)).toISOString(),
      resolvedAt: new Date(now - 48 * 24 * 60 * 60_000 + m(18)).toISOString(),
    },
    {
      id: '202403/resolved-007',
      title: 'BYOD Azure SQL — storage capacity warning',
      body: 'SQL storage utilization reached 85% capacity. Azure auto-scale triggered additional storage allocation within 35 minutes.',
      status: 'resolved',
      severity: 'minor',
      affectedComponents: ['byod-sql'],
      createdAt: new Date(d(72)).toISOString(),
      resolvedAt: new Date(now - 72 * 24 * 60 * 60_000 + m(35)).toISOString(),
    },
    {
      id: '202403/resolved-008',
      title: 'Logistics API — vendor datacenter outage',
      body: 'Third-party logistics provider experienced a datacenter networking fault. Service was restored when the provider brought their DR environment online after 3 hours 5 minutes.',
      status: 'resolved',
      severity: 'critical',
      affectedComponents: ['logistics-api'],
      createdAt: new Date(d(85)).toISOString(),
      resolvedAt: new Date(now - 85 * 24 * 60 * 60_000 + m(185)).toISOString(),
    },
  ]);
}
