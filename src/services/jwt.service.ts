import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export function signAccessToken(payload: { sub: string; email: string; mfa_verified?: boolean }): string {
  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '15m',
    issuer: 'amygdala'
  });
}

export function verifyAccessToken(token: string): { sub: string; email: string; mfa_verified?: boolean; iat: number; exp: number } {
  return jwt.verify(token, env.JWT_PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: 'amygdala'
  }) as { sub: string; email: string; mfa_verified?: boolean; iat: number; exp: number };
}

export function getJWKS(): { keys: any[] } {
  const publicKey = crypto.createPublicKey(env.JWT_PUBLIC_KEY);
  const jwk = publicKey.export({ format: 'jwk' });
  return {
    keys: [
      {
        ...jwk,
        alg: 'RS256',
        use: 'sig',
        kid: 'amygdala-key-1'
      }
    ]
  };
}
