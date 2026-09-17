import { Router } from 'express';
import { authMiddleware } from '../../../middleware/auth';
import { query } from '../../../db/client';
import { logger } from '../../../utils/logger';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await query(
      'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
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

export default router;
