import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.string().default("3000"),
  HOST: z.string().default("localhost"),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.string().default("6379"),
  REDIS_PASSWORD: z.string().optional(),

  // Neo4j (Phase 2)
  NEO4J_URI: z.string().optional(),
  NEO4J_USER: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),

  // LanceDB (Phase 2)
  LANCEDB_PATH: z.string().default("./data/lancedb"),

  // LLM
  LLM_PROVIDER: z.enum(["qwen", "openai"]).default("qwen"),
  QWEN_API_KEY: z.string().optional(),
  QWEN_BASE_URL: z
    .string()
    .default("https://dashscope.aliyuncs.com/compatible-mode/v1"),
  OPENAI_API_KEY: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().default("100"),
  RATE_LIMIT_WINDOW: z.string().default("60000"),

  // Analysis
  ANALYSIS_TOP_K: z.string().default("5"),
  ANALYSIS_CONFIDENCE_THRESHOLD: z.string().default("0.7"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}
