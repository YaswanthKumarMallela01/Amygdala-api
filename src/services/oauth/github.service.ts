import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export function buildGitHubAuthURL(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_REDIRECT_URI,
    scope: 'user:email',
    state
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGitHubCode(code: string): Promise<{ id: string; email: string; login: string }> {
  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(`GitHub token error: ${tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Amygdala'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`GitHub user fetch failed: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Amygdala'
      }
    });

    if (!emailsResponse.ok) {
      throw new Error(`GitHub emails fetch failed: ${emailsResponse.statusText}`);
    }

    const emailsData = await emailsResponse.json();
    const primaryEmail = emailsData.find((e: any) => e.primary && e.verified)?.email || 
                         emailsData.find((e: any) => e.verified)?.email || 
                         emailsData[0]?.email;

    return {
      id: userData.id.toString(),
      email: primaryEmail,
      login: userData.login
    };
  } catch (error) {
    logger.error({ err: error }, 'GitHub OAuth exchange error');
    throw error;
  }
}
