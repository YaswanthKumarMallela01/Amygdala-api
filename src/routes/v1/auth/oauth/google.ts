import { Router } from 'express';
import { env } from '../../../../config/env';
import { buildGoogleAuthURL, exchangeGoogleCode } from '../../../../services/oauth/google.service';
import { storeOAuthState, getOAuthState, deleteOAuthState } from '../../../../services/redis.service';
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
    
    const clientId = req.apiClient?.id || null;
    const redirectUri = (req.query.redirect_uri as string) || (req.query.redirectUri as string) || null;

    // If client specified a custom redirect_uri, validate against apiClient allowed_origins
    if (redirectUri && req.apiClient) {
      const allowed = req.apiClient.allowed_origins || [];
      const isWildcard = allowed.includes('*');
      let origin = '';
      try {
        origin = new URL(redirectUri).origin;
      } catch {
        return res.status(400).json({ error: 'Invalid redirect_uri format' });
      }

      const isAllowed = isWildcard || 
        allowed.includes(origin) || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.includes('onrender.com');

      if (!isAllowed) {
        return res.status(403).json({ 
          error: `Redirect URI origin '${origin}' is not allowed by this API key. Allowed origins: ${allowed.join(', ')}` 
        });
      }
    }

    await storeOAuthState(state, {
      codeVerifier,
      clientId,
      redirectUri
    });
    
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
    
    const stateData = await getOAuthState(String(state));
    if (!stateData || !stateData.codeVerifier) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }
    
    await deleteOAuthState(String(state));

    const { codeVerifier, clientId, redirectUri } = stateData;
    
    const profile = await exchangeGoogleCode(String(code), codeVerifier);
    
    let userId: string;
    
    // Check existing oauth identity scoped by client_id
    let identityQuery = 'SELECT user_id FROM oauth_identities WHERE provider = $1 AND provider_user_id = $2 AND client_id IS NULL';
    let identityParams: any[] = ['google', profile.sub];
    if (clientId) {
      identityQuery = 'SELECT user_id FROM oauth_identities WHERE provider = $1 AND provider_user_id = $2 AND client_id = $3';
      identityParams = ['google', profile.sub, clientId];
    }

    const { rows: existingIdentity } = await query(identityQuery, identityParams);
    
    let userName = profile.name || '';
    
    if (existingIdentity.length > 0) {
      userId = existingIdentity[0].user_id;
      if (profile.name) {
        await query('UPDATE users SET name = COALESCE(name, $1) WHERE id = $2', [profile.name, userId]);
      }
      const uRes = await query('SELECT name FROM users WHERE id = $1', [userId]);
      if (uRes.rows[0]?.name) userName = uRes.rows[0].name;
    } else {
      // Check if user with this email exists in this tenant pool
      let userQuery = 'SELECT id, name FROM users WHERE email = $1 AND client_id IS NULL';
      let userParams: any[] = [profile.email];
      if (clientId) {
        userQuery = 'SELECT id, name FROM users WHERE email = $1 AND client_id = $2';
        userParams = [profile.email, clientId];
      }

      const { rows: existingUser } = await query(userQuery, userParams);
      
      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        if (profile.name && !existingUser[0].name) {
          await query('UPDATE users SET name = $1 WHERE id = $2', [profile.name, userId]);
        } else if (existingUser[0].name) {
          userName = existingUser[0].name;
        }
      } else {
        const { rows: newUser } = await query(
          'INSERT INTO users (email, name, email_verified, client_id) VALUES ($1, $2, true, $3) RETURNING id, name',
          [profile.email, profile.name || null, clientId || null]
        );
        userId = newUser[0].id;
        if (newUser[0].name) userName = newUser[0].name;
      }
      
      await query(
        'INSERT INTO oauth_identities (user_id, provider, provider_user_id, client_id) VALUES ($1, $2, $3, $4)',
        [userId, 'google', profile.sub, clientId || null]
      );
    }
    
    const accessToken = signAccessToken({ sub: userId, email: profile.email, name: userName, mfa_verified: true });
    const deviceInfo = req.header('user-agent') || 'OAuth (Google)';
    const { rawToken } = await createRefreshToken(userId, deviceInfo);

    // Record login session in tenant_login_sessions if client_id is present
    if (clientId) {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      await query(
        `INSERT INTO tenant_login_sessions (client_id, user_id, user_email, user_name, ip_address, device_info)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, userId, profile.email, userName || null, ip, deviceInfo]
      );
    }
    
    // Redirect back to client's redirect_uri or Amygdala internal callback
    const targetRedirect = redirectUri || `${env.APP_BASE_URL}/auth/callback`;
    const separator = targetRedirect.includes('#') ? '&' : '#';
    res.redirect(`${targetRedirect}${separator}access_token=${accessToken}&refresh_token=${rawToken}`);
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
