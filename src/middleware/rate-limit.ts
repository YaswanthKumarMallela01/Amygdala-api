import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../services/redis.service';

export function createRateLimiter(windowMs: number = 15 * 60 * 1000, max: number = 100) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: async (...args: string[]) => {
        return redis.call(args[0], ...args.slice(1)) as any;
      },
    }),
  });
}
