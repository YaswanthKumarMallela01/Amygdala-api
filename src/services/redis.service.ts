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

export async function storeOAuthState(state: string, codeVerifier: string, ttl: number = 600): Promise<void> {
  await redis.set(`oauth_state:${state}`, codeVerifier, 'EX', ttl);
}

export async function getOAuthCodeVerifier(state: string): Promise<string | null> {
  return await redis.get(`oauth_state:${state}`);
}

export async function deleteOAuthState(state: string): Promise<void> {
  await redis.del(`oauth_state:${state}`);
}
