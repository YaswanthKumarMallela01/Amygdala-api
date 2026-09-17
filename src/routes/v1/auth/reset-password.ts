import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate';
import { query } from '../../../db/client';
import { hashToken } from '../../../utils/crypto';
import { hashPassword } from '../../../services/password.service';
import { revokeAllUserTokens } from '../../../services/token.service';
import { logger } from '../../../utils/logger';

const router = Router();
const bodySchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
});

router.post('/', validate(bodySchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = hashToken(token);
    
    const { rows } = await query(
      'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = $1 AND used = false AND expires_at > now()',
      [tokenHash]
    );
    
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const resetToken = rows[0];
    const hashedPassword = await hashPassword(newPassword);
    
    await query('BEGIN');
    
    await query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );
    
    await query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [resetToken.id]
    );
    
    await query('COMMIT');
    
    await revokeAllUserTokens(resetToken.user_id);
    
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    await query('ROLLBACK');
    logger.error({ err }, 'Reset password error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
