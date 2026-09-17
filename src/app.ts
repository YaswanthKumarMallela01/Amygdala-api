import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';
import { apiKeyMiddleware } from './middleware/api-key';
import { createRateLimiter } from './middleware/rate-limit';
import authRouter from './routes/v1/auth';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(createRateLimiter());

// API key middleware for all /v1/auth routes
app.use('/v1/auth', apiKeyMiddleware, authRouter);

// Health check (no API key required)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled exception');
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
