import type { Request, Response, NextFunction } from 'express';
import { generateId, logger } from '@sentinel/shared';
import type { SentinelEvent, OutcomeStatus } from '@sentinel/event-schema';
import type {
  SentinelConfig,
  SecurityEventInput,
  AuthorizationEventInput,
  HttpEventInput,
} from './types.js';
import { deliverBatch } from './delivery.js';

const DEFAULT_INGESTION_URL = 'http://localhost:8080';
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_MAX_RETRIES = 3;

export class SentinelClient {
  private readonly config: SentinelConfig;
  private readonly queue: SentinelEvent[] = [];
  private readonly batchSize: number;
  private readonly timer: NodeJS.Timeout;

  constructor(config: SentinelConfig) {
    this.config = config;
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;

    this.timer = setInterval(() => {
      void this.flush();
    }, config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS);
    this.timer.unref();
  }

  expressMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req, res, next): void => {
      const start = Date.now();
      const requestId = generateId('req');
      const userAgent = req.headers['user-agent'];

      res.on('finish', () => {
        const durationMs = Date.now() - start;
        this.captureHttpEvent({
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs,
          requestId,
          ...(req.ip !== undefined ? { sourceIp: req.ip } : {}),
          ...(userAgent !== undefined ? { userAgent } : {}),
        });
      });

      next();
    };
  }

  securityEvent(input: SecurityEventInput): void {
    this.enqueue({
      id: generateId('evt'),
      organizationId: this.config.organizationId,
      timestamp: new Date().toISOString(),
      ingestionTimestamp: new Date().toISOString(),
      source: { type: 'application', integrationId: this.config.applicationId },
      action: { type: input.action, category: input.type },
      outcome: { status: input.outcome },
      confidence: 1,
      payload: {},
      ...(input.actorId !== undefined ? { actor: { type: 'user', id: input.actorId } } : {}),
    });
  }

  authorization(input: AuthorizationEventInput): void {
    this.enqueue({
      id: generateId('evt'),
      organizationId: this.config.organizationId,
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

  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);
    await deliverBatch(batch, {
      apiKey: this.config.apiKey,
      ingestionUrl: this.config.ingestionUrl ?? DEFAULT_INGESTION_URL,
      maxRetries: this.config.maxRetries ?? DEFAULT_MAX_RETRIES,
    });
  }

  close(): void {
    clearInterval(this.timer);
  }

  private captureHttpEvent(input: HttpEventInput): void {
    const outcomeStatus: OutcomeStatus =
      input.statusCode >= 500 ? 'failure' : input.statusCode >= 400 ? 'blocked' : 'success';

    this.enqueue({
      id: generateId('evt'),
      organizationId: this.config.organizationId,
      timestamp: new Date().toISOString(),
      ingestionTimestamp: new Date().toISOString(),
      source: { type: 'application', integrationId: this.config.applicationId },
      action: { type: 'http.request', category: 'http', target: input.path },
      request: {
        requestId: input.requestId,
        ...(input.sourceIp !== undefined ? { sourceIp: input.sourceIp } : {}),
        ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
      },
      outcome: { status: outcomeStatus },
      confidence: 1,
      payload: {
        method: input.method,
        statusCode: input.statusCode,
        durationMs: input.durationMs,
      },
    });
  }

  private enqueue(event: SentinelEvent): void {
    this.queue.push(event);
    logger.debug('event queued', { eventId: event.id, action: event.action.type });

    if (this.queue.length >= this.batchSize) {
      void this.flush();
    }
  }
}
