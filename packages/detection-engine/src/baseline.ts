import type { SentinelEvent } from '@sentinel/event-schema';
import type { Detection } from './types.js';

export interface BaselineQuery {
  organizationId: string;
  integrationId: string;
  actionCategory: string;
  windowMs: number;
  lagMs: number;
  actionTarget?: string;
}

export interface BaselineHistory {
  countBaseline: (query: BaselineQuery) => Promise<number>;
}

export interface BaselineRule {
  id: string;
  description: string;
  evaluate: (event: SentinelEvent, history: BaselineHistory) => Promise<Detection | null>;
}
