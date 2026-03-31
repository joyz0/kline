import { z } from "zod";

const serverConfigSchema = z.object({
  port: z.number().int().positive().max(65535).default(3000),
  host: z.string().default("localhost"),
});

const redisConfigSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().int().positive().max(65535).default(6379),
  password: z.string().optional().default(""),
});

const neo4jConfigSchema = z.object({
  uri: z.string().default("bolt://localhost:7687"),
  user: z.string().default("neo4j"),
  password: z.string().default("neo4j"),
});

const lancedbConfigSchema = z.object({
  path: z.string().default("./data/lancedb"),
});

const llmProviderSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().optional(),
});

const llmConfigSchema = z.object({
  provider: z.enum(["qwen", "openai"]).default("qwen"),
  qwen: llmProviderSchema.optional(),
  openai: llmProviderSchema.optional(),
});

const rateLimitConfigSchema = z.object({
  max: z.number().int().positive().default(100),
  window: z.number().int().positive().default(60000),
});

const analysisConfigSchema = z.object({
  topK: z.number().int().positive().default(5),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
});

const loggingConfigSchema = z.object({
  level: z.number().int().min(0).max(5).default(4),
});

const akshareConfigSchema = z.object({
  enabled: z.boolean().default(true),
  transport: z.enum(['stdio', 'http']).default('stdio'),
  command: z.string().default('uv'),
  args: z.array(z.string()).default(['run', '--project', 'python', '--python', '3.12', 'akshare-mcp-server']),
  cwd: z.string().default('.'),
  timeoutMs: z.number().int().positive().default(15000),
  httpUrl: z.string().optional(),
});

export const appConfigSchema = z.object({
  server: serverConfigSchema,
  redis: redisConfigSchema,
  neo4j: neo4jConfigSchema.optional(),
  lancedb: lancedbConfigSchema.optional(),
  llm: llmConfigSchema,
  rateLimit: rateLimitConfigSchema.optional(),
  analysis: analysisConfigSchema.optional(),
  logging: loggingConfigSchema.optional(),
  akshare: akshareConfigSchema.optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type RedisConfig = z.infer<typeof redisConfigSchema>;
export type Neo4jConfig = z.infer<typeof neo4jConfigSchema>;
export type LanceDBConfig = z.infer<typeof lancedbConfigSchema>;
export type LLMConfig = z.infer<typeof llmConfigSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
export type AnalysisConfig = z.infer<typeof analysisConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type AkshareConfig = z.infer<typeof akshareConfigSchema>;
