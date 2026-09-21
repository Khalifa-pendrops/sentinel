import type { FastifyInstance } from 'fastify';
import { hashApiKey } from '@sentinel/auth';
import { findApiKeyByHash, listEvents } from '@sentinel/db';

export function registerRoutes(app: FastifyInstance): void {
  app.get('/v1/events', async (request, reply) => {
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

    const query = request.query as Record<string, unknown>;
    const actionType = typeof query['actionType'] === 'string' ? query['actionType'] : undefined;
    const sinceRaw = typeof query['since'] === 'string' ? query['since'] : undefined;
    const untilRaw = typeof query['until'] === 'string' ? query['until'] : undefined;
    const cursor = typeof query['cursor'] === 'string' ? query['cursor'] : undefined;
    const limitRaw = typeof query['limit'] === 'string' ? Number(query['limit']) : undefined;

    const since = sinceRaw !== undefined ? new Date(sinceRaw) : undefined;
    const until = untilRaw !== undefined ? new Date(untilRaw) : undefined;
    const limit = limitRaw !== undefined && !Number.isNaN(limitRaw) ? limitRaw : undefined;

    const result = await listEvents({
      organizationId: keyRecord.organizationId,
      ...(actionType !== undefined ? { actionType } : {}),
      ...(since !== undefined ? { since } : {}),
      ...(until !== undefined ? { until } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(cursor !== undefined ? { cursor } : {}),
    });

    return reply.code(200).send(result);
  });
}
