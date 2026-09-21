import { buildServer } from './server.js';
import { logger } from '@sentinel/shared';

const app = await buildServer();
const port = Number(process.env['PORT'] ?? 8081);

app.listen({ port, host: '0.0.0.0' }).then(
  () => logger.info('api service listening', { port }),
  (err: unknown) => {
    logger.error('failed to start api service', { error: String(err) });
    process.exit(1);
  },
);
