import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate';
import { turnstileConditional } from '../../../middleware/turnstile';
import { verifyPassword } from '../../../services/password.service';
import { signAccessToken } from '../../../services/jwt.service';
import { createRefreshToken } from '../../../services/token.service';
import { query } from '../../../db/client';
import { logger } from '../../../utils/logger';
import { incrementFailedLoginAttempts } from '../../../services/redis.service';
import * as jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

const router = Router();
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
  turnstileToken: z.string().optional(),
});

router.post('/', validate(bodySchema), turnstileConditional(), async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  
  try {
    const clientId = req.apiClient?.id || null;
    let result;
    if (clientId) {
      result = await query('SELECT id, email, name, password_hash, mfa_secret FROM users WHERE email = $1 AND client_id = $2', [email, clientId]);
    } else {
      result = await query('SELECT id, email, name, password_hash, mfa_secret FROM users WHERE email = $1 AND client_id IS NULL', [email]);
    }
    const user = result.rows[0];
    
    if (!user || !user.password_hash) {
      await incrementFailedLoginAttempts(`login_attempts:${email}`);
      await query('INSERT INTO login_attempts (email, ip_address, success, client_id) VALUES ($1, $2, $3, $4)', [email, ip, false, clientId]);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await verifyPassword(user.password_hash, password);
    if (!isValid) {
      await incrementFailedLoginAttempts(`login_attempts:${email}`);
      await query('INSERT INTO login_attempts (email, ip_address, success, client_id) VALUES ($1, $2, $3, $4)', [email, ip, false, clientId]);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    await query('INSERT INTO login_attempts (email, ip_address, success, client_id) VALUES ($1, $2, $3, $4)', [email, ip, true, clientId]);
    
    if (user.mfa_secret) {
      const mfaToken = jwt.sign({ sub: user.id, scope: 'mfa' }, env.JWT_PRIVATE_KEY, { algorithm: 'RS256', expiresIn: '5m' });
      return res.json({ mfaRequired: true, mfaToken });
    }
    
    const deviceInfo = req.header('user-agent');
    const { rawToken: refreshToken } = await createRefreshToken(user.id, deviceInfo);
    const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name || undefined, mfa_verified: true });
    
    if (clientId) {
      await query(
        `INSERT INTO tenant_login_sessions (client_id, user_id, user_email, user_name, ip_address, device_info)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, user.id, user.email, user.name, ip, deviceInfo]
      );
    }
    
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name || null } });
  } catch (err) {
    logger.error({ err }, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
