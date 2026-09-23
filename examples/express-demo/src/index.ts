import express from 'express';
import { Sentinel } from '@sentinel/sdk-node';

const apiKey = process.env['SENTINEL_API_KEY'];
const organizationId = process.env['SENTINEL_ORGANIZATION_ID'];

if (apiKey === undefined || organizationId === undefined) {
  throw new Error('SENTINEL_API_KEY and SENTINEL_ORGANIZATION_ID must be set');
}

const sentinel = Sentinel.init({
  apiKey,
  organizationId,
  applicationId: 'express-demo',
  environment: 'development',
  ingestionUrl: process.env['SENTINEL_INGESTION_URL'] ?? 'http://localhost:8080',
  flushIntervalMs: 3000,
});

const app = express();
app.use(sentinel.expressMiddleware());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/boom', (_req, res) => {
  res.status(500).json({ error: 'simulated failure' });
});

const port = Number(process.env['PORT'] ?? 4000);
app.listen(port, () => {
  console.log('express-demo listening on port ' + port);
});
