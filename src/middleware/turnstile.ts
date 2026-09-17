import { Request, Response, NextFunction } from 'express';
import { verifyTurnstileToken } from '../services/turnstile.service';
import { getFailedLoginAttempts } from '../services/redis.service';
import { logger } from '../utils/logger';

export function turnstileRequired() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { turnstileToken } = req.body;
    if (!turnstileToken) {
        return res.status(403).json({ error: 'Turnstile verification failed' });
    }
    
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const isValid = await verifyTurnstileToken(turnstileToken, ip);
      if (!isValid) {
        return res.status(403).json({ error: 'Turnstile verification failed' });
      }
      next();
    } catch (error) {
      logger.error({ err: error }, 'Turnstile verification error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function turnstileConditional() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { email, turnstileToken } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const key = email ? `login_attempts:${email}` : `login_attempts:${ip}`;
    
    try {
      const attempts = await getFailedLoginAttempts(key);
      if (attempts >= 3) {
        if (!turnstileToken) {
           return res.status(403).json({ error: 'Turnstile verification failed' });
        }
        const isValid = await verifyTurnstileToken(turnstileToken, ip);
        if (!isValid) {
          return res.status(403).json({ error: 'Turnstile verification failed' });
        }
      }
      next();
    } catch (error) {
      logger.error({ err: error }, 'Turnstile conditional verification error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
