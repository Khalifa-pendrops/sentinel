import type { OutcomeStatus } from '@sentinel/event-schema';

export interface SentinelConfig {
  apiKey: string;
  organizationId: string;
  applicationId: string;
  environment: string;
  ingestionUrl?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  maxRetries?: number;
}

export interface SecurityEventInput {
  type: string;
  action: string;
  actorId?: string;
  outcome: OutcomeStatus;
}

export interface AuthorizationEventInput {
  actorId: string;
  action: string;
  resource: string;
  decision: 'allowed' | 'denied';
}

export type AuthenticationAction = 'login' | 'logout' | 'session_created' | 'session_expired';

export interface AuthenticationEventInput {
  action: AuthenticationAction;
  outcome: OutcomeStatus;
  actorId?: string;
  method?: string;
}

export interface HttpEventInput {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  sourceIp?: string;
  userAgent?: string;
}
