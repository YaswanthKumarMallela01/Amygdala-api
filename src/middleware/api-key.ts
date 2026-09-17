import { Request, Response, NextFunction } from 'express';
import { query } from '../db/client';
import { hashToken } from '../utils/crypto';
import { logger } from '../utils/logger';

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header('x-api-key');
  
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
    if (origin && client.allowed_origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    next();
  } catch (error) {
    logger.error({ err: error }, 'API key verification error');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
