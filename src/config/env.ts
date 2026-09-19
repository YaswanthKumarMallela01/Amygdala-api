import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_REDIRECT_URI: z.string(),
  TURNSTILE_SITE_KEY: z.string(),
  TURNSTILE_SECRET_KEY: z.string(),
  RESEND_API_KEY: z.string(),
  JWT_PRIVATE_KEY: z.string().transform(v => v.replace(/\\n/g, '\n')),
  JWT_PUBLIC_KEY: z.string().transform(v => v.replace(/\\n/g, '\n')),
  REDIS_URL: z.string(),
  APP_BASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
