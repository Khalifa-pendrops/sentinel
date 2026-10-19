import type { SentinelEvent } from '@sentinel/event-schema';
import type { Detection } from './types.js';

export interface HistoryQuery {
  organizationId: string;
  actionCategory: string;
  outcomeStatus: string;
  windowMs: number;
  actorId?: string;
  sourceIp?: string;
}

export interface EventHistory {
  countRecent: (query: HistoryQuery) => Promise<number>;
}

export interface HistoricalDetectionRule {
  id: string;
  description: string;
  evaluate: (event: SentinelEvent, history: EventHistory) => Promise<Detection | null>;
}
