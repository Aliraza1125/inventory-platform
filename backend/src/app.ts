import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { apiRouter, webhookRoutes } from './routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { env } from './config/env';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.frontendOrigin }));
  app.use(morgan(env.nodeEnv === 'test' ? 'dev' : 'tiny'));

  // Webhooks need the raw request body (for HMAC signature verification), so they're mounted
  // before the global express.json() parser and handle their own body parsing per-route.
  app.use('/api/webhooks', webhookRoutes);

  app.use(express.json());
  app.use('/api', apiRouter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
