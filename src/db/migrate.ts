import fs from 'fs';
import path from 'path';
import { pool } from './client';
import { logger } from '../utils/logger';

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    logger.info('Migrations directory not found, skipping.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
    
  logger.info(`Found ${files.length} migration files.`);
  
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    logger.info(`Executing migration: ${file}`);
    await pool.query(sql);
    logger.info(`Successfully executed ${file}`);
  }
  
  logger.info('All migrations completed successfully.');
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err }, 'Migration failed');
      await pool.end();
      process.exit(1);
    });
}
