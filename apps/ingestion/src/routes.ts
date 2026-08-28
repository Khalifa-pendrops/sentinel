import type { FastifyInstance } from 'fastify';
import { logger } from '@sentinel/shared';
import { verifyApiKey } from '@sentinel/auth';
import { isValidSentinelEvent } from './validation.js';

export function registerRoutes(app: FastifyInstance): void {
  app.post('/v1/events', async (request, reply) => {
    const apiKey = request.headers['x-sentinel-api-key'];
    if (typeof apiKey !== 'string') {
      return reply.code(401).send({ error: 'missing api key' });
    }

    const salt = process.env['SENTINEL_INGESTION_API_KEY_SALT'] ?? '';
    const storedHash = process.env['SENTINEL_TEST_KEY_HASH'] ?? '';
    if (!verifyApiKey(apiKey, salt, storedHash)) {
      return reply.code(401).send({ error: 'invalid api key' });
    }

    if (!isValidSentinelEvent(request.body)) {
      return reply.code(400).send({ error: 'invalid event payload' });
    }

    logger.info('event accepted', { eventId: request.body.id });
    return reply.code(202).send({ accepted: true });
  });
}
