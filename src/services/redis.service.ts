import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  tls: {},
  maxRetriesPerRequest: 3
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export async function getFailedLoginAttempts(key: string): Promise<number> {
  const val = await redis.get(key);
  return val ? parseInt(val, 10) : 0;
}

export async function incrementFailedLoginAttempts(key: string): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 900); // 15 mins
  await pipeline.exec();
}

export interface OAuthStateData {
  codeVerifier: string;
  clientId?: string | null;
  redirectUri?: string | null;
}

export async function storeOAuthState(
  state: string,
  data: string | OAuthStateData,
  ttl: number = 600
): Promise<void> {
  const value = typeof data === 'string' ? JSON.stringify({ codeVerifier: data }) : JSON.stringify(data);
  await redis.set(`oauth_state:${state}`, value, 'EX', ttl);
}

export async function getOAuthState(state: string): Promise<OAuthStateData | null> {
  const val = await redis.get(`oauth_state:${state}`);
  if (!val) return null;
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === 'string') {
      return { codeVerifier: parsed };
    }
    return parsed;
  } catch {
    return { codeVerifier: val };
  }
}

export async function getOAuthCodeVerifier(state: string): Promise<string | null> {
  const stateData = await getOAuthState(state);
  return stateData ? stateData.codeVerifier : null;
}

export async function deleteOAuthState(state: string): Promise<void> {
  await redis.del(`oauth_state:${state}`);
}

