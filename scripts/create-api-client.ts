import { parseArgs } from 'util';
import { query } from '../src/db/client';
import { generateRandomToken, hashToken } from '../src/utils/crypto';
import { logger } from '../src/utils/logger';

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      name: { type: 'string' },
      origins: { type: 'string' },
    },
  });

  if (!values.name || !values.origins) {
    console.error('Usage: tsx scripts/create-api-client.ts --name "My App" --origins "http://localhost:3000,https://myapp.com"');
    process.exit(1);
  }

  const name = values.name;
  const allowedOrigins = values.origins.split(',').map(o => o.trim());

  const apiKey = generateRandomToken();
  const apiKeyHash = hashToken(apiKey);

  try {
    await query(
      'INSERT INTO api_clients (name, api_key_hash, allowed_origins) VALUES ($1, $2, $3)',
      [name, apiKeyHash, allowedOrigins]
    );

    console.log(`\nAPI Client "${name}" created successfully!`);
    console.log('\n=== IMPORTANT: SAVE THIS API KEY NOW ===');
    console.log(`API Key: ${apiKey}`);
    console.log('========================================\n');
    console.log('This key will NOT be shown again. It is stored as a one-way hash in the database.');
    
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Failed to create API client');
    process.exit(1);
  }
}

main();
