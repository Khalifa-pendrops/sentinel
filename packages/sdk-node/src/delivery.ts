import { logger } from '@sentinel/shared';
import type { SentinelEvent } from '@sentinel/event-schema';

export interface DeliveryConfig {
  apiKey: string;
  ingestionUrl: string;
  maxRetries: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverBatch(events: SentinelEvent[], config: DeliveryConfig): Promise<boolean> {
  let attempt = 0;

  while (attempt <= config.maxRetries) {
    try {
      const response = await fetch(config.ingestionUrl + '/v1/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sentinel-api-key': config.apiKey,
        },
        body: JSON.stringify(events),
      });

      if (response.status >= 200 && response.status < 300) {
        logger.debug('batch delivered', { eventCount: events.length, attempt });
        return true;
      }

      if (response.status >= 400 && response.status < 500) {
        logger.error('batch rejected by server, will not retry', {
          eventCount: events.length,
          statusCode: response.status,
        });
        return false;
      }

      logger.warn('batch delivery failed, will retry', {
        eventCount: events.length,
        statusCode: response.status,
        attempt,
      });
    } catch (error: unknown) {
      logger.warn('batch delivery network error, will retry', {
        eventCount: events.length,
        error: String(error),
        attempt,
      });
    }

    attempt += 1;
    if (attempt <= config.maxRetries) {
      await sleep(2 ** attempt * 250);
    }
  }

  logger.error('batch delivery exhausted retries, dropping batch', { eventCount: events.length });
  return false;
}
