import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate';
import { query } from '../../../db/client';
import { generateRandomToken, hashToken } from '../../../utils/crypto';
import { sendPasswordResetEmail } from '../../../services/email.service';
import { logger } from '../../../utils/logger';

const router = Router();
const bodySchema = z.object({ email: z.string().email() });

router.post('/', validate(bodySchema), async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (rows.length > 0) {
      const user = rows[0];
      const token = generateRandomToken();
      const tokenHash = hashToken(token);
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);
      
      await query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, tokenHash, expiresAt]
      );
      
      await sendPasswordResetEmail(email, token);
    }
    
    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    logger.error({ err }, 'Forgot password error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
