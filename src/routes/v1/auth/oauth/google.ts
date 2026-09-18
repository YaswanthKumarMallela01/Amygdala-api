import { Router } from 'express';
import { env } from '../../../../config/env';
import { buildGoogleAuthURL, exchangeGoogleCode } from '../../../../services/oauth/google.service';
import { storeOAuthState, getOAuthCodeVerifier, deleteOAuthState } from '../../../../services/redis.service';
import { generateState, generateCodeVerifier, generateCodeChallenge } from '../../../../utils/crypto';
import { signAccessToken } from '../../../../services/jwt.service';
import { createRefreshToken } from '../../../../services/token.service';
import { query } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    await storeOAuthState(state, codeVerifier);
    
    const url = buildGoogleAuthURL(state, codeChallenge);
    res.redirect(url);
  } catch (err) {
    logger.error({ err }, 'Google OAuth initiate error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.status(400).json({ error: String(error) });
    }
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }
    
    const codeVerifier = await getOAuthCodeVerifier(String(state));
    if (!codeVerifier) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }
    
    await deleteOAuthState(String(state));
    
    const profile = await exchangeGoogleCode(String(code), codeVerifier);
    
    let userId: string;
    
    const { rows: existingIdentity } = await query(
      'SELECT user_id FROM oauth_identities WHERE provider = $1 AND provider_user_id = $2',
      ['google', profile.sub]
    );
    
    let userName = profile.name || '';
    
    if (existingIdentity.length > 0) {
      userId = existingIdentity[0].user_id;
      if (profile.name) {
        await query('UPDATE users SET name = COALESCE(name, $1) WHERE id = $2', [profile.name, userId]);
      }
      const uRes = await query('SELECT name FROM users WHERE id = $1', [userId]);
      if (uRes.rows[0]?.name) userName = uRes.rows[0].name;
    } else {
      const { rows: existingUser } = await query(
        'SELECT id, name FROM users WHERE email = $1',
        [profile.email]
      );
      
      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        if (profile.name && !existingUser[0].name) {
          await query('UPDATE users SET name = $1 WHERE id = $2', [profile.name, userId]);
        } else if (existingUser[0].name) {
          userName = existingUser[0].name;
        }
      } else {
        const { rows: newUser } = await query(
          'INSERT INTO users (email, name, email_verified) VALUES ($1, $2, true) RETURNING id, name',
          [profile.email, profile.name || null]
        );
        userId = newUser[0].id;
        if (newUser[0].name) userName = newUser[0].name;
      }
      
      await query(
        'INSERT INTO oauth_identities (user_id, provider, provider_user_id) VALUES ($1, $2, $3)',
        [userId, 'google', profile.sub]
      );
    }
    
    const accessToken = signAccessToken({ sub: userId, email: profile.email, name: userName, mfa_verified: true });
    const { rawToken } = await createRefreshToken(userId);
    
    res.redirect(`${env.APP_BASE_URL}/auth/callback#access_token=${accessToken}&refresh_token=${rawToken}`);
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
