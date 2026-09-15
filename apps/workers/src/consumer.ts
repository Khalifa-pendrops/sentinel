import type { SentinelEvent } from '@sentinel/event-schema';
import { logger } from '@sentinel/shared';
import { runPipeline } from './pipeline.js';

export async function handleEventBatch(events: SentinelEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const result = await runPipeline(events);
  logger.info('batch processed', {
    eventCount: events.length,
    incidentCount: result.incidents.length,
  });
}

// TODO(pubsub-wiring): once a real subscription is wired here, the message
// handler MUST await handleEventBatch(...) before acking the Pub/Sub message.
// Acking before this resolves means a DB failure silently drops the event
// instead of triggering Pub/Sub redelivery.
export function startConsumer(): void {
  logger.info('worker consumer started (Pub/Sub subscription not yet wired - see infra/terraform)');
}
