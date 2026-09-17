import { Request, Response, NextFunction } from 'express';
import { query } from '../db/client';
import { hashToken } from '../utils/crypto';
import { logger } from '../utils/logger';

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Handle CORS preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    const origin = req.header('Origin') || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    return res.status(204).end();
  }

  // Allow OAuth callbacks and public JWKS endpoint without API key
  if (
    req.path.includes('/oauth/google/callback') ||
    req.path.includes('/oauth/github/callback') ||
    req.path.includes('/.well-known/jwks.json')
  ) {
    return next();
  }

  const apiKey =
    req.header('x-api-key') ||
    (req.query['x-api-key'] as string) ||
    (req.query['apiKey'] as string) ||
    (req.query['api_key'] as string);
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  try {
    const hash = hashToken(apiKey);
    const result = await query('SELECT * FROM api_clients WHERE api_key_hash = $1', [hash]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const client = result.rows[0];
    req.apiClient = client;

    const origin = req.header('Origin');
    if (origin) {
      const isAllowed =
        client.allowed_origins.includes('*') ||
        client.allowed_origins.includes(origin) ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('onrender.com');

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      }
    }
    
    next();
  } catch (error) {
    logger.error({ err: error }, 'API key verification error');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
