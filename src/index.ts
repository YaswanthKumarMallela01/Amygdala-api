import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';

async function startServer() {
  try {
    logger.info('Running database migrations...');
    await runMigrations();
  } catch (err) {
    logger.error({ err }, 'Warning: Database migration failed on startup');
  }

  app.listen(env.PORT, () => {
    logger.info(`Amygdala API running on port ${env.PORT}`);
  });
}

startServer();
