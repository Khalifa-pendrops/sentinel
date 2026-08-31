import type { SentinelEvent } from '@sentinel/event-schema';
import { logger } from '@sentinel/shared';
import { runPipeline } from './pipeline.js';

export function handleEventBatch(events: SentinelEvent[]): void {
  if (events.length === 0) {
    return;
  }

  const result = runPipeline(events);
  logger.info('batch processed', {
    eventCount: events.length,
    incidentCount: result.incidents.length,
  });
}

export function startConsumer(): void {
  logger.info('worker consumer started (Pub/Sub subscription not yet wired - see infra/terraform)');
}
