import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate';
import { turnstileRequired } from '../../../middleware/turnstile';
import { hashPassword } from '../../../services/password.service';
import { signAccessToken } from '../../../services/jwt.service';
import { createRefreshToken } from '../../../services/token.service';
import { query } from '../../../db/client';
import { logger } from '../../../utils/logger';

const router = Router();
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  turnstileToken: z.string(),
});

router.post('/', validate(bodySchema), turnstileRequired(), async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    const hashedPassword = await hashPassword(password);
    
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    const user = result.rows[0];
    
    logger.info({ userId: user.id }, 'User signup successful');
    
    const deviceInfo = req.header('user-agent');
    const { rawToken: refreshToken } = await createRefreshToken(user.id, deviceInfo);
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email } });
  } catch (err) {
    logger.error({ err }, 'Signup error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
