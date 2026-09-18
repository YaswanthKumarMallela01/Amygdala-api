import { Router } from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { authMiddleware } from '../../../../middleware/auth';
import { query } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const secret = authenticator.generateSecret();
    
    await query(
      'UPDATE users SET mfa_secret = $1, updated_at = now() WHERE id = $2',
      [secret, req.user.sub]
    );
    
    const uri = authenticator.keyuri(req.user.email, 'Amygdala', secret);
    const qrCode = await QRCode.toDataURL(uri);
    
    res.json({ secret, qrCode, uri });
  } catch (err) {
    logger.error({ err }, 'MFA enroll error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await query(
      'UPDATE users SET mfa_secret = NULL, updated_at = now() WHERE id = $1',
      [req.user.sub]
    );

    res.json({ message: 'MFA disabled successfully' });
  } catch (err) {
    logger.error({ err }, 'MFA disable error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
