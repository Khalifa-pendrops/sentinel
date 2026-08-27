export type EventSourceType = 'application' | 'gcp' | 'identity' | 'billing' | 'cicd';

export type OutcomeStatus = 'success' | 'failure' | 'blocked' | 'unknown';

export type EvidenceLevel = 'confirmed' | 'suspected' | 'not_detected' | 'unknown';

export interface SecuritySignal {
  type: string;
  description: string;
}

export interface SentinelEvent {
  id: string;
  organizationId: string;
  timestamp: string;
  ingestionTimestamp: string;
  source: {
    type: EventSourceType;
    integrationId: string;
  };
  actor?: {
    type: string;
    id?: string;
    provider?: string;
  };
  action: {
    type: string;
    category: string;
    target?: string;
  };
  resource?: {
    type: string;
    id?: string;
    name?: string;
  };
  request?: {
    requestId?: string;
    traceId?: string;
    spanId?: string;
    sourceIp?: string;
    userAgent?: string;
  };
  outcome: {
    status: OutcomeStatus;
  };
  securitySignals?: SecuritySignal[];
  confidence: number;
  payload: Record<string, unknown>;
}
