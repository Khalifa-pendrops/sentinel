import type { FastifyInstance } from 'fastify';
import { logger } from '@sentinel/shared';
import { hashApiKey } from '@sentinel/auth';
import { findApiKeyByHash, saveEvent } from '@sentinel/db';
import { isValidSentinelEvent } from './validation.js';
import { publishEvent } from './publisher.js';

type EventStatus = 'accepted' | 'duplicate' | 'invalid' | 'organization_mismatch';

interface EventResult {
  id: string;
  status: EventStatus;
}

function extractPossibleId(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null && typeof (raw as Record<string, unknown>)['id'] === 'string') {
    return (raw as Record<string, unknown>)['id'] as string;
  }
  return 'unknown';
}

async function processEvent(rawEvent: unknown, organizationId: string): Promise<EventResult> {
  if (!isValidSentinelEvent(rawEvent)) {
    return { id: extractPossibleId(rawEvent), status: 'invalid' };
  }

  if (rawEvent.organizationId !== organizationId) {
    logger.warn('organization mismatch on event submission', {
      claimedOrganizationId: rawEvent.organizationId,
      authenticatedOrganizationId: organizationId,
    });
    return { id: rawEvent.id, status: 'organization_mismatch' };
  }

  const { created } = await saveEvent(rawEvent);

  if (!created) {
    logger.info('duplicate event ignored', { eventId: rawEvent.id });
    return { id: rawEvent.id, status: 'duplicate' };
  }

  await publishEvent(rawEvent);
  logger.info('event accepted', { eventId: rawEvent.id, organizationId });
  return { id: rawEvent.id, status: 'accepted' };
}

export function registerRoutes(app: FastifyInstance): void {
  app.post('/v1/events', async (request, reply) => {
    const apiKey = request.headers['x-sentinel-api-key'];
    if (typeof apiKey !== 'string') {
      return reply.code(401).send({ error: 'missing api key' });
    }

    const salt = process.env['SENTINEL_INGESTION_API_KEY_SALT'] ?? '';
    const hashedKey = hashApiKey(apiKey, salt);
    const keyRecord = await findApiKeyByHash(hashedKey);

    if (keyRecord === null) {
      return reply.code(401).send({ error: 'invalid api key' });
    }

    if (Array.isArray(request.body)) {
      const results: EventResult[] = [];
      for (const rawEvent of request.body) {
        results.push(await processEvent(rawEvent, keyRecord.organizationId));
      }
      return reply.code(202).send({ results });
    }

    const result = await processEvent(request.body, keyRecord.organizationId);

    if (result.status === 'invalid') {
      return reply.code(400).send({ error: 'invalid event payload' });
    }
    if (result.status === 'organization_mismatch') {
      return reply.code(403).send({ error: 'organization mismatch' });
    }
    if (result.status === 'duplicate') {
      return reply.code(202).send({ accepted: true, duplicate: true });
    }
    return reply.code(202).send({ accepted: true });
  });
}
