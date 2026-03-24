/**
 * 配置默认值常量
 *
 * 本文件定义了系统所有配置的默认值，确保在配置文件或环境变量缺失时
 * 系统能够正常运行。
 */

import path from 'path';

// ==================== 基础路径配置 ====================
export const KLINE_BASE_DIR = path.join(process.cwd(), '.kline');

// ==================== 服务器配置默认值 ====================
export const DEFAULT_SERVER = {
  port: 3000,
  host: 'localhost',
} as const;

// ==================== Redis 配置默认值 ====================
export const DEFAULT_REDIS = {
  host: 'localhost',
  port: 6379,
  password: '',
} as const;

// ==================== 数据库配置默认值 ====================
export const DEFAULT_NEO4J = {
  uri: 'bolt://localhost:7687',
  user: 'neo4j',
  password: 'neo4j',
} as const;

export const DEFAULT_LANCEDB = {
  path: './data/lancedb',
} as const;

// ==================== LLM 配置默认值 ====================
export const DEFAULT_LLM = {
  provider: 'qwen' as const,
  qwen: {
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
  },
} as const;

// ==================== 浏览器配置默认值 ====================
export const DEFAULT_BROWSER_PROFILE = {
  cdpPort: 18800,
  userDataDir: './data/browsers/default/user-data',
  headless: false,
  executablePath: '',
  extraArgs: ['--disable-gpu', '--no-sandbox'] as const,
  color: '#FF4500',
} as const;

export const DEFAULT_BROWSER = {
  enabled: true,
  defaultProfile: 'default',
  profiles: {
    default: DEFAULT_BROWSER_PROFILE,
  },
} as const;

// ==================== 速率限制配置默认值 ====================
export const DEFAULT_RATE_LIMIT = {
  max: 100,
  window: 60000, // 1 分钟
} as const;

// ==================== 分析配置默认值 ====================
export const DEFAULT_ANALYSIS = {
  topK: 5,
  confidenceThreshold: 0.7,
} as const;

// ==================== 日志配置默认值 ====================
export const DEFAULT_LOGGING = {
  level: 4, // 0=fatal, 1=error, 2=warn, 3=info, 4=debug, 5=trace
} as const;

// ==================== 环境变量默认值 ====================
export const DEFAULT_ENV = {
  // Server
  PORT: '3000',
  HOST: 'localhost',

  // Redis
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: '',

  // Neo4j
  NEO4J_URI: 'bolt://localhost:7687',
  NEO4J_USER: 'neo4j',
  NEO4J_PASSWORD: 'neo4j',

  // LanceDB
  LANCEDB_PATH: './data/lancedb',

  // LLM
  LLM_PROVIDER: 'qwen',
  QWEN_API_KEY: '',
  QWEN_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  OPENAI_API_KEY: '',

  // Rate Limiting
  RATE_LIMIT_MAX: '100',
  RATE_LIMIT_WINDOW: '60000',

  // Analysis
  ANALYSIS_TOP_K: '5',
  ANALYSIS_CONFIDENCE_THRESHOLD: '0.7',

  // Logging
  LOG_LEVEL: '4',
} as const;

// ==================== 配置合并工具函数 ====================
/**
 * 深度合并两个对象
 * @param target 目标对象
 * @param source 源对象（用于覆盖）
 * @returns 合并后的对象
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target } as any;

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }
  }

  return result as T;
}
