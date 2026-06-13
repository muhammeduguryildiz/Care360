import { NextResponse } from 'next/server';

const MOCK_COMPONENTS = [
  { componentId: 'fno-prod',            displayName: 'F&O Availability',         probeType: 'fno',        group: 'F&O Platform',  intervalSeconds: 60,  enabled: true,  paramsJson: '{"environmentUrl":"https://xxx.operations.dynamics.com"}', thresholdsJson: '{}' },
  { componentId: 'fno-exceptions',      displayName: 'F&O Exception Rate',        probeType: 'appinsights', group: 'F&O Platform',  intervalSeconds: 300, enabled: true,  paramsJson: '{"kql":"exceptions | summarize count()"}',                thresholdsJson: '{}' },
  { componentId: 'fno-batch',           displayName: 'F&O Batch Health',          probeType: 'appinsights', group: 'F&O Platform',  intervalSeconds: 300, enabled: true,  paramsJson: '{"kql":"customEvents | where name == \\"BatchJobFailed\\""}', thresholdsJson: '{}' },
  { componentId: 'crm-api',             displayName: 'CRM Integration',           probeType: 'http',        group: 'Integrations',  intervalSeconds: 60,  enabled: true,  paramsJson: '{"url":"https://crm.example.com/health","method":"GET","expectedStatus":200}', thresholdsJson: '{}' },
  { componentId: 'erp-connector',       displayName: 'ERP Connector',             probeType: 'http',        group: 'Integrations',  intervalSeconds: 60,  enabled: true,  paramsJson: '{"url":"https://erp.example.com/api/ping","method":"GET","expectedStatus":200}', thresholdsJson: '{"degradedMs":2000,"unhealthyMs":5000}' },
  { componentId: 'logistics-api',       displayName: 'Logistics API',             probeType: 'http',        group: 'Integrations',  intervalSeconds: 60,  enabled: true,  paramsJson: '{"url":"https://logistics.example.com/health","method":"GET","expectedStatus":200}', thresholdsJson: '{}' },
  { componentId: 'payment-gateway',     displayName: 'Payment Gateway',           probeType: 'http',        group: 'Integrations',  intervalSeconds: 60,  enabled: true,  paramsJson: '{"url":"https://pay.example.com/status","method":"GET","expectedStatus":200}', thresholdsJson: '{}' },
  { componentId: 'ecommerce-api',       displayName: 'E-Commerce API',            probeType: 'http',        group: 'Integrations',  intervalSeconds: 60,  enabled: true,  paramsJson: '{"url":"https://shop.example.com/health","method":"GET","expectedStatus":200}', thresholdsJson: '{}' },
  { componentId: 'deploy-pipeline',     displayName: 'Production Deployment',     probeType: 'devops',      group: 'Pipelines',     intervalSeconds: 300, enabled: true,  paramsJson: '{"organization":"myorg","project":"Care360","definitionId":12}', thresholdsJson: '{}' },
  { componentId: 'integration-pipeline',displayName: 'Integration Sync Pipeline', probeType: 'devops',      group: 'Pipelines',     intervalSeconds: 300, enabled: true,  paramsJson: '{"organization":"myorg","project":"Care360","definitionId":7}',  thresholdsJson: '{}' },
  { componentId: 'byod-sql',            displayName: 'BYOD Azure SQL',            probeType: 'sql',         group: 'Data Stores',   intervalSeconds: 60,  enabled: true,  paramsJson: '{"connectionStringSecretRef":"byod-sql-connstr"}',            thresholdsJson: '{}' },
  { componentId: 'integration-bus',     displayName: 'Service Bus',               probeType: 'servicebus',  group: 'Data Stores',   intervalSeconds: 60,  enabled: true,  paramsJson: '{"namespaceUri":"https://xxx.servicebus.windows.net","queueName":"integration-queue"}', thresholdsJson: '{}' },
];

export async function GET() {
  return NextResponse.json(MOCK_COMPONENTS);
}

export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json(
    { ...body, componentId: body.componentId ?? 'new-component' },
    { status: 201 }
  );
}
