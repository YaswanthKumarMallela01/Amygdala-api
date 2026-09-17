import { Router } from 'express';
import { env } from '../../../../config/env';
import { buildGitHubAuthURL, exchangeGitHubCode } from '../../../../services/oauth/github.service';
import { storeOAuthState, getOAuthCodeVerifier, deleteOAuthState } from '../../../../services/redis.service';
import { generateState } from '../../../../utils/crypto';
import { signAccessToken } from '../../../../services/jwt.service';
import { createRefreshToken } from '../../../../services/token.service';
import { query } from '../../../../db/client';
import { logger } from '../../../../utils/logger';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const state = generateState();
    
    await storeOAuthState(state, 'github');
    
    const url = buildGitHubAuthURL(state);
    res.redirect(url);
  } catch (err) {
    logger.error({ err }, 'GitHub OAuth initiate error');
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
    
    const storedState = await getOAuthCodeVerifier(String(state));
    if (!storedState) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }
    
    await deleteOAuthState(String(state));
    
    const profile = await exchangeGitHubCode(String(code));
    
    let userId: string;
    const providerUserId = String(profile.id);
    
    const { rows: existingIdentity } = await query(
      'SELECT user_id FROM oauth_identities WHERE provider = $1 AND provider_user_id = $2',
      ['github', providerUserId]
    );
    
    if (existingIdentity.length > 0) {
      userId = existingIdentity[0].user_id;
    } else {
      const { rows: existingUser } = await query(
        'SELECT id FROM users WHERE email = $1',
        [profile.email]
      );
      
      if (existingUser.length > 0) {
        userId = existingUser[0].id;
      } else {
        const { rows: newUser } = await query(
          'INSERT INTO users (email, email_verified) VALUES ($1, true) RETURNING id',
          [profile.email]
        );
        userId = newUser[0].id;
      }
      
      await query(
        'INSERT INTO oauth_identities (user_id, provider, provider_user_id) VALUES ($1, $2, $3)',
        [userId, 'github', providerUserId]
      );
    }
    
    const accessToken = signAccessToken({ sub: userId, email: profile.email, mfa_verified: true });
    const { rawToken } = await createRefreshToken(userId);
    
    res.redirect(`${env.APP_BASE_URL}/auth/callback#access_token=${accessToken}&refresh_token=${rawToken}`);
  } catch (err) {
    logger.error({ err }, 'GitHub OAuth callback error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
