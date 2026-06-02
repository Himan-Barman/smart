import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_SECRET: z.string().min(16).optional(),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('60d'),
  REFRESH_TOKEN_COOKIE_NAME: z.string().min(1).default('smart-campus-refresh'),
  REFRESH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
  CORS_ORIGIN: z.string().default('*'),
  SERVE_FRONTEND: z.enum(['true', 'false', '1', '0']).default('false').transform((value) => value === 'true' || value === '1'),
  FRONTEND_DIST_PATH: z.string().optional(),
  TRUST_PROXY: z.enum(['true', 'false', '1', '0']).transform((value) => value === 'true' || value === '1').optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET ?? parsed.data.JWT_SECRET,
  JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET ?? `${parsed.data.JWT_SECRET}:refresh`,
  TRUST_PROXY: parsed.data.TRUST_PROXY ?? (parsed.data.NODE_ENV === 'production'),
};
