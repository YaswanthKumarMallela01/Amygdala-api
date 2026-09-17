import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt.service';

export function authMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = verifyAccessToken(token);
      req.user = {
        sub: decoded.sub,
        email: decoded.email,
        mfa_verified: decoded.mfa_verified,
      };
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
