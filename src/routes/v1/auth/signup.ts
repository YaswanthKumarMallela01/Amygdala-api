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
  name: z.string().optional(),
  turnstileToken: z.string(),
});

router.post('/', validate(bodySchema), turnstileRequired(), async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    const clientId = req.apiClient?.id || null;
    
    let existing;
    if (clientId) {
      existing = await query('SELECT id FROM users WHERE email = $1 AND client_id = $2', [email, clientId]);
    } else {
      existing = await query('SELECT id FROM users WHERE email = $1 AND client_id IS NULL', [email]);
    }

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    const hashedPassword = await hashPassword(password);
    
    const result = await query(
      'INSERT INTO users (email, password_hash, name, client_id) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
      [email, hashedPassword, name || null, clientId]
    );
    const user = result.rows[0];
    
    logger.info({ userId: user.id }, 'User signup successful');
    
    const deviceInfo = req.header('user-agent');
    
    if (clientId) {
      await query(
        `INSERT INTO tenant_login_sessions (client_id, user_id, user_email, user_name, ip_address, device_info)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, user.id, user.email, user.name, req.ip || 'unknown', deviceInfo]
      );
    }
    const { rawToken: refreshToken } = await createRefreshToken(user.id, deviceInfo);
    const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name || undefined });
    
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name || null } });
  } catch (err) {
    logger.error({ err }, 'Signup error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
