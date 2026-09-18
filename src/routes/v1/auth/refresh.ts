import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate';
import { rotateRefreshToken } from '../../../services/token.service';
import { signAccessToken } from '../../../services/jwt.service';
import { query } from '../../../db/client';
import { logger } from '../../../utils/logger';

const router = Router();
const bodySchema = z.object({
  refreshToken: z.string(),
});

router.post('/', validate(bodySchema), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const { rawToken: newRawToken, userId } = await rotateRefreshToken(refreshToken);
    
    const result = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const { email, name } = result.rows[0];
    
    const accessToken = signAccessToken({ sub: userId, email, name: name || undefined });
    
    res.json({ accessToken, refreshToken: newRawToken });
  } catch (err: any) {
    if (err.message === 'Token reuse detected') {
      logger.warn('Token reuse detected');
      return res.status(401).json({ error: 'Token reuse detected, please login again' });
    }
    logger.error({ err }, 'Refresh token error');
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
