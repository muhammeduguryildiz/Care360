export type ComponentStatus = 'Healthy' | 'Degraded' | 'Unhealthy' | 'Unknown' | 'Maintenance';
export type IncidentSeverity = 'minor' | 'major' | 'critical' | 'maintenance';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface ComponentSnapshot {
  id: string;
  name: string;
  probeType: string;
  status: ComponentStatus;
  responseTimeMs: number;
  message: string;
  checkedAt: string | null;
  lastChangedAt: string | null;
}

export interface ComponentGroup {
  name: string;
  components: ComponentSnapshot[];
}

export interface Incident {
  id: string;
  title: string;
  body: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  affectedComponents: string[];
  createdAt: string;
  resolvedAt: string | null;
}

export interface StatusResponse {
  overall: ComponentStatus;
  checkedAt: string;
  groups: ComponentGroup[];
  activeIncidents: Incident[];
}

export interface HistoryPoint {
  checkedAt: string;
  status: ComponentStatus;
  responseTimeMs: number;
  message: string;
}

export interface HistoryResponse {
  componentId: string;
  range: string;
  uptimePercent: number;
  series: HistoryPoint[];
}

export interface ComponentConfig {
  componentId: string;
  probeType: string;
  displayName: string;
  group: string;
  intervalSeconds: number;
  enabled: boolean;
  paramsJson: string;
  thresholdsJson: string;
}
