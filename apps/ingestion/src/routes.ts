import type { FastifyInstance } from 'fastify';
import { logger } from '@sentinel/shared';
import { hashApiKey } from '@sentinel/auth';
import { findApiKeyByHash } from '@sentinel/db';
import { isValidSentinelEvent } from './validation.js';

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

    if (!isValidSentinelEvent(request.body)) {
      return reply.code(400).send({ error: 'invalid event payload' });
    }

    logger.info('event accepted', {
      eventId: request.body.id,
      organizationId: keyRecord.organizationId,
    });
    return reply.code(202).send({ accepted: true });
  });
}
