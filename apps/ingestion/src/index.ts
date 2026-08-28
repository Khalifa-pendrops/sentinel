import { buildServer } from './server.js';
import { logger } from '@sentinel/shared';

const app = buildServer();
const port = Number(process.env['PORT'] ?? 8080);

app.listen({ port, host: '0.0.0.0' }).then(
  () => logger.info('ingestion service listening', { port }),
  (err: unknown) => {
    logger.error('failed to start ingestion service', { error: String(err) });
    process.exit(1);
  },
);
