import { PubSub } from '@google-cloud/pubsub';
import type { SentinelEvent } from '@sentinel/event-schema';
import { logger } from '@sentinel/shared';

const pubsub = new PubSub({ projectId: process.env['GCP_PROJECT_ID'] ?? 'sentinel-dev' });
const topicName = process.env['PUBSUB_TOPIC'] ?? 'sentinel-events-dev';

export async function publishEvent(event: SentinelEvent): Promise<void> {
  const dataBuffer = Buffer.from(JSON.stringify(event));
  const messageId = await pubsub.topic(topicName).publishMessage({ data: dataBuffer });
  logger.info('event published to queue', { eventId: event.id, messageId });
}
