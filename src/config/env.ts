import { z } from 'zod';
import { DEFAULT_ENV } from './config-defaults.js';

const envSchema = z.object({
  // Server
  PORT: z.string().default(DEFAULT_ENV.PORT),
  HOST: z.string().default(DEFAULT_ENV.HOST),

  // Redis
  REDIS_HOST: z.string().default(DEFAULT_ENV.REDIS_HOST),
  REDIS_PORT: z.string().default(DEFAULT_ENV.REDIS_PORT),
  REDIS_PASSWORD: z.string().default(DEFAULT_ENV.REDIS_PASSWORD),

  // Neo4j (Phase 2)
  NEO4J_URI: z.string().default(DEFAULT_ENV.NEO4J_URI),
  NEO4J_USER: z.string().default(DEFAULT_ENV.NEO4J_USER),
  NEO4J_PASSWORD: z.string().default(DEFAULT_ENV.NEO4J_PASSWORD),

  // LanceDB (Phase 2)
  LANCEDB_PATH: z.string().default(DEFAULT_ENV.LANCEDB_PATH),

  // LLM
  LLM_PROVIDER: z.enum(['qwen', 'openai']).default(DEFAULT_ENV.LLM_PROVIDER),
  QWEN_API_KEY: z.string().default(DEFAULT_ENV.QWEN_API_KEY),
  QWEN_BASE_URL: z.string().default(DEFAULT_ENV.QWEN_BASE_URL),
  OPENAI_API_KEY: z.string().default(DEFAULT_ENV.OPENAI_API_KEY),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().default(DEFAULT_ENV.RATE_LIMIT_MAX),
  RATE_LIMIT_WINDOW: z.string().default(DEFAULT_ENV.RATE_LIMIT_WINDOW),

  // Analysis
  ANALYSIS_TOP_K: z.string().default(DEFAULT_ENV.ANALYSIS_TOP_K),
  ANALYSIS_CONFIDENCE_THRESHOLD: z
    .string()
    .default(DEFAULT_ENV.ANALYSIS_CONFIDENCE_THRESHOLD),

  // Logging
  LOG_LEVEL: z.string().default(DEFAULT_ENV.LOG_LEVEL),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}
