import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../../middleware/validate';
import { authenticator } from 'otplib';
import { verifyAccessToken, signAccessToken } from '../../../../services/jwt.service';
import { createRefreshToken } from '../../../../services/token.service';
import { query } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

const router = Router();
const bodySchema = z.object({ code: z.string().length(6) });

router.post('/', validate(bodySchema), async (req, res) => {
  try {
    const { code } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.substring(7);
    let decoded;
    let isEnrollment = false;
    let isMfaLogin = false;
    
    try {
      decoded = verifyAccessToken(token);
      
      if ((decoded as any).scope === 'mfa') {
        isMfaLogin = true;
      } else {
        isEnrollment = true;
      }
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userId = decoded.sub;
    
    const { rows } = await query('SELECT mfa_secret, email FROM users WHERE id = $1', [userId]);
    if (rows.length === 0 || !rows[0].mfa_secret) {
      return res.status(400).json({ error: 'MFA not pending or enabled for this user' });
    }
    
    const user = rows[0];
    const isValid = authenticator.verify({ token: code, secret: user.mfa_secret });
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid MFA code' });
    }
    
    if (isEnrollment) {
      return res.json({ message: 'MFA enabled successfully' });
    }
    
    if (isMfaLogin) {
      const accessToken = signAccessToken({ sub: userId, email: user.email, mfa_verified: true });
      const { rawToken } = await createRefreshToken(userId);
      return res.json({ accessToken, refreshToken: rawToken });
    }
    
  } catch (err) {
    logger.error({ err }, 'MFA verify error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
