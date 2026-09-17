import { PubSub, type Message } from '@google-cloud/pubsub';
import type { SentinelEvent } from '@sentinel/event-schema';
import { logger } from '@sentinel/shared';
import { runPipeline } from './pipeline.js';

const pubsub = new PubSub({ projectId: process.env['GCP_PROJECT_ID'] ?? 'sentinel-dev' });
const subscriptionName = process.env['PUBSUB_SUBSCRIPTION'] ?? 'sentinel-workers-dev';

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

async function handleMessage(message: Message): Promise<void> {
  try {
    const event = JSON.parse(message.data.toString('utf8')) as SentinelEvent;
    await handleEventBatch([event]);
    message.ack();
  } catch (error: unknown) {
    logger.error('failed to process message, will retry', {
      messageId: message.id,
      error: String(error),
    });
    message.nack();
  }
}

export function startConsumer(): void {
  const subscription = pubsub.subscription(subscriptionName);
  subscription.on('message', (message: Message) => {
    void handleMessage(message);
  });
  subscription.on('error', (error: unknown) => {
    logger.error('subscription error', { error: String(error) });
  });
  logger.info('worker consumer started', { subscriptionName });
}
