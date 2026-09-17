import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export function buildGoogleAuthURL(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline'
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<{ sub: string; email: string; name: string }> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      throw new Error(`Google token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Decode id_token payload
    const parts = data.id_token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token');
    }
    
    const payloadBuffer = Buffer.from(parts[1], 'base64');
    const payload = JSON.parse(payloadBuffer.toString('utf8'));
    
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || ''
    };
  } catch (error) {
    logger.error({ err: error }, 'Google OAuth exchange error');
    throw error;
  }
}
