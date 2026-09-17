import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { query } from '../../../db/client';
import { generateRandomToken, hashToken } from '../../../utils/crypto';
import { logger } from '../../../utils/logger';

const router = Router();

const createKeySchema = z.object({
  name: z.string().min(1).max(50).default('Default App Key'),
  allowedOrigins: z.array(z.string()).default(['*'])
});

// GET /v1/auth/keys - List keys belonging to the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rows } = await query(
      'SELECT id, name, allowed_origins, created_at FROM api_clients WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ keys: rows });
  } catch (err) {
    logger.error({ err }, 'Error fetching API keys');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /v1/auth/keys - Create new API key (Limit: 3 keys max per account)
router.post('/', authMiddleware, validate(createKeySchema), async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check key limit (3 keys max per account)
    const countResult = await query(
      'SELECT COUNT(*) as count FROM api_clients WHERE user_id = $1',
      [userId]
    );
    const count = parseInt(countResult.rows[0].count, 10);

    if (count >= 3) {
      return res.status(400).json({
        error: 'Maximum limit of 3 API keys reached. Please delete an existing key before creating a new one.'
      });
    }

    const { name, allowedOrigins } = req.body;
    const rawApiKey = generateRandomToken();
    const apiKeyHash = hashToken(rawApiKey);

    const insertResult = await query(
      `INSERT INTO api_clients (name, api_key_hash, allowed_origins, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, allowed_origins, created_at`,
      [name, apiKeyHash, allowedOrigins, userId]
    );

    const newKeyRecord = insertResult.rows[0];

    logger.info({ userId, keyId: newKeyRecord.id }, 'New user API key generated');

    res.status(201).json({
      apiKey: rawApiKey, // Returned once only!
      key: newKeyRecord,
      message: 'API Key generated successfully. Save this key now; it will not be displayed again.'
    });
  } catch (err) {
    logger.error({ err }, 'Error creating API key');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /v1/auth/keys/:id - Delete API key belonging to user
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    const keyId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deleteResult = await query(
      'DELETE FROM api_clients WHERE id = $1 AND user_id = $2 RETURNING id',
      [keyId, userId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found or you do not have permission to delete it.' });
    }

    logger.info({ userId, keyId }, 'API key deleted');
    res.json({ message: 'API key deleted successfully.' });
  } catch (err) {
    logger.error({ err }, 'Error deleting API key');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
