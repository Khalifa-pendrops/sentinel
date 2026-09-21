import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes.js';

function resolveCorsOrigin(): boolean | string[] {
  const isProduction = process.env['NODE_ENV'] === 'production';
  if (!isProduction) {
    return true;
  }

  const allowedOrigins = process.env['ALLOWED_ORIGINS'];
  if (allowedOrigins === undefined || allowedOrigins.trim().length === 0) {
    throw new Error('ALLOWED_ORIGINS must be set in production - refusing to start with an open CORS policy');
  }

  return allowedOrigins.split(',').map((origin) => origin.trim());
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: resolveCorsOrigin() });
  registerRoutes(app);
  return app;
}
