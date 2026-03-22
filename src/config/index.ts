import { loadEnv, type Env } from "./env.js";

export const env: Env = loadEnv();

export const config = {
  server: {
    port: parseInt(env.PORT, 10),
    host: env.HOST,
  },
  redis: {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT, 10),
    password: env.REDIS_PASSWORD || undefined,
  },
  neo4j: {
    uri: env.NEO4J_URI,
    user: env.NEO4J_USER,
    password: env.NEO4J_PASSWORD,
  },
  lancedb: {
    path: env.LANCEDB_PATH,
  },
  llm: {
    provider: env.LLM_PROVIDER,
    qwen: {
      apiKey: env.QWEN_API_KEY,
      baseUrl: env.QWEN_BASE_URL,
    },
    openai: {
      apiKey: env.OPENAI_API_KEY,
    },
  },
  rateLimit: {
    max: parseInt(env.RATE_LIMIT_MAX, 10),
    window: parseInt(env.RATE_LIMIT_WINDOW, 10),
  },
  analysis: {
    topK: parseInt(env.ANALYSIS_TOP_K, 10),
    confidenceThreshold: parseFloat(env.ANALYSIS_CONFIDENCE_THRESHOLD),
  },
};
