import Fastify, { type FastifyInstance } from 'fastify';
import { registerRoutes } from './routes.js';

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false });
  registerRoutes(app);
  return app;
}
