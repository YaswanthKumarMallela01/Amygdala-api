import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  try {
    const body = new URLSearchParams();
    body.append('secret', env.TURNSTILE_SECRET_KEY);
    body.append('response', token);
    if (ip) {
      body.append('remoteip', ip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body
    });

    const data = await response.json();
    logger.info({ success: data.success }, 'Turnstile verification result');
    
    return !!data.success;
  } catch (error) {
    logger.error({ err: error }, 'Turnstile verification failed');
    return false;
  }
}
