import { generateId, logger } from '@sentinel/shared';
import type { SentinelEvent } from '@sentinel/event-schema';
import type { SentinelConfig, SecurityEventInput, AuthorizationEventInput } from './types.js';

export class SentinelClient {
  private readonly config: SentinelConfig;
  private readonly queue: SentinelEvent[] = [];

  constructor(config: SentinelConfig) {
    this.config = config;
  }

  middleware(): (req: unknown, res: unknown, next: () => void) => void {
    return (_req, _res, next): void => {
      next();
    };
  }

  securityEvent(input: SecurityEventInput): void {
    this.enqueue({
      id: generateId('evt'),
      organizationId: this.config.applicationId,
      timestamp: new Date().toISOString(),
      ingestionTimestamp: new Date().toISOString(),
      source: { type: 'application', integrationId: this.config.applicationId },
      action: { type: input.action, category: input.type },
      outcome: { status: input.outcome },
      confidence: 1,
      payload: {},
      ...(input.actorId ? { actor: { type: 'user', id: input.actorId } } : {}),
    });
  }

  authorization(input: AuthorizationEventInput): void {
    this.enqueue({
      id: generateId('evt'),
      organizationId: this.config.applicationId,
      timestamp: new Date().toISOString(),
      ingestionTimestamp: new Date().toISOString(),
      source: { type: 'application', integrationId: this.config.applicationId },
      actor: { type: 'user', id: input.actorId },
      action: { type: input.action, category: 'authorization', target: input.resource },
      outcome: { status: input.decision === 'allowed' ? 'success' : 'blocked' },
      confidence: 1,
      payload: {},
    });
  }

  private enqueue(event: SentinelEvent): void {
    this.queue.push(event);
    logger.debug('event queued', { eventId: event.id, action: event.action.type });
  }
}
