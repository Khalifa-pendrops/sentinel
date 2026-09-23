import Fastify from 'fastify';
import { Sentinel } from '@sentinel/sdk-node';

const apiKey = process.env['SENTINEL_API_KEY'];
const organizationId = process.env['SENTINEL_ORGANIZATION_ID'];

if (apiKey === undefined || organizationId === undefined) {
  throw new Error('SENTINEL_API_KEY and SENTINEL_ORGANIZATION_ID must be set');
}

const sentinel = Sentinel.init({
  apiKey,
  organizationId,
  applicationId: 'fastify-demo',
  environment: 'development',
  ingestionUrl: process.env['SENTINEL_INGESTION_URL'] ?? 'http://localhost:8080',
  flushIntervalMs: 3000,
});

const app = Fastify({ logger: false });
sentinel.fastifyPlugin()(app);

app.get('/health', async (_request, reply) => {
  return reply.code(200).send({ status: 'ok' });
});

app.get('/boom', async (_request, reply) => {
  return reply.code(500).send({ error: 'simulated failure' });
});

const port = Number(process.env['PORT'] ?? 4001);
app.listen({ port, host: '0.0.0.0' }).then(
  () => console.log('fastify-demo listening on port ' + port),
  (err: unknown) => {
    console.error('failed to start fastify-demo', err);
    process.exit(1);
  },
);
