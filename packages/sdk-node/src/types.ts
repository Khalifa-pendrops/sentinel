import type { OutcomeStatus } from '@sentinel/event-schema';

export interface SentinelConfig {
  apiKey: string;
  applicationId: string;
  environment: string;
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
