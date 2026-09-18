import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { query } from '../../../db/client';
import { revokeAllUserTokens } from '../../../services/token.service';
import { logger } from '../../../utils/logger';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// GET /v1/auth/me
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await query(
      'SELECT id, email, name, email_verified, (mfa_secret IS NOT NULL) AS mfa_enabled, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, 'Error fetching current user');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /v1/auth/me - Update profile name
router.patch('/', authMiddleware, validate(updateProfileSchema), async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;
    await query(
      'UPDATE users SET name = $1, updated_at = now() WHERE id = $2',
      [name || null, userId]
    );

    res.json({ message: 'Profile updated successfully', name: name || null });
  } catch (err) {
    logger.error({ err }, 'Error updating user profile');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /v1/auth/me - Permanently delete account
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Revoke all refresh tokens
    await revokeAllUserTokens(userId);

    // Delete user from database (cascades to oauth_identities, tokens, api_clients, etc.)
    await query('DELETE FROM users WHERE id = $1', [userId]);

    logger.info({ userId }, 'User permanently deleted their account');
    res.json({ message: 'Account permanently deleted' });
  } catch (err) {
    logger.error({ err }, 'Error deleting user account');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

