import { env } from '../config/env';
import { logger } from '../utils/logger';

// Cloudflare's official test secret key that always passes verification
const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  // In development, use Cloudflare's always-pass test key
  const secretKey = process.env.NODE_ENV === 'production'
    ? env.TURNSTILE_SECRET_KEY
    : TURNSTILE_TEST_SECRET;

  try {
    const body = new URLSearchParams();
    body.append('secret', secretKey);
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

