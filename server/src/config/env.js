import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET must be at least 10 characters'),
  BSC_RPC_URL: z.string().url().default('https://bsc-dataseed.binance.org'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  AI_ENGINE_URL: z.string().url().default('http://localhost:8000'),
  BINANCE_BASE_URL: z.string().url().default('https://api.binance.com'),
  BINANCE_PROXY_URL: z.string().optional().default(''),
  ALPHA_VANTAGE_API_KEY: z.string().default('demo'),
  POCKET_OPTION_API_KEY: z.string().optional().default(''),
  POCKET_OPTION_HEADLESS: z.string().optional().default('false'),
  POCKET_OPTION_SIMULATE_ONLY: z.string().optional().default('false'),
  POCKET_OPTION_URL: z.string().url().default('https://pocketoption.com/en/cabinet/demo-quick-high-low/'),
  MT5_BRIDGE_URL: z.string().optional().default(''),
  ADMIN_EMAIL: z.string().email().default('uborabusiness.group@gmail.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
