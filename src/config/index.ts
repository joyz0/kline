import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';
import { logger } from '../logging/index.js';
import { loadEnv, type Env } from './env.js';
import { EnvReplacer } from './env-replacer.js';
import { PathResolver } from './path-resolver.js';
import {
  appConfigSchema,
  type AppConfig,
  type ServerConfig,
  type RedisConfig,
  type LLMConfig,
  type RateLimitConfig,
  type AnalysisConfig,
  type LoggingConfig,
} from './app-config.schema.js';
import {
  browserConfigSchema,
  type BrowserConfig,
  type BrowserProfile,
} from './browser-config.schema.js';
import {
  DEFAULT_SERVER,
  DEFAULT_REDIS,
  DEFAULT_LLM,
  DEFAULT_BROWSER,
  DEFAULT_RATE_LIMIT,
  DEFAULT_ANALYSIS,
  DEFAULT_LOGGING,
  KLINE_BASE_DIR,
  deepMerge,
} from './config-defaults.js';

const KLINE_DIR = path.join(process.cwd(), '.kline');
const KLINE_CONFIG_FILE = path.join(KLINE_DIR, 'kline.json5');
const ENV_FILE = path.join(KLINE_DIR, '.env');

export interface UnifiedConfig {
  server: ServerConfig;
  redis: RedisConfig;
  llm: LLMConfig;
  browser: BrowserConfig;
  rateLimit?: RateLimitConfig;
  analysis?: AnalysisConfig;
  logging?: LoggingConfig;
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private env: Env | null = null;
  private unifiedConfig: UnifiedConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * 加载所有配置
   */
  async loadAll(): Promise<{
    env: Env;
    config: UnifiedConfig;
  }> {
    this.env = await this.loadEnv();
    this.unifiedConfig = this.loadUnifiedConfig();

    return {
      env: this.env,
      config: this.unifiedConfig,
    };
  }

  /**
   * 加载环境变量
   */
  async loadEnv(): Promise<Env> {
    // 尝试从 .kline/.env 加载
    const envFilePath = process.env.ENV_FILE || ENV_FILE;

    if (fs.existsSync(envFilePath)) {
      logger.info(`Loading environment from ${envFilePath}`);
      const dotenv = await import('dotenv');
      const envConfig = dotenv.default.config({ path: envFilePath });

      // 合并环境变量
      Object.entries(envConfig.parsed || {}).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value as string;
        }
      });
    }

    this.env = loadEnv();
    return this.env;
  }

  /**
   * 加载统一配置
   */
  loadUnifiedConfig(): UnifiedConfig {
    const configPath = process.env.KLINE_CONFIG_FILE || KLINE_CONFIG_FILE;

    if (!fs.existsSync(configPath)) {
      logger.warn(`Config file not found: ${configPath}, using defaults`);
      return this.createDefaultConfig();
    }

    try {
      let content = fs.readFileSync(configPath, 'utf-8');

      // 替换环境变量占位符 ${env:VARIABLE_NAME}
      content = EnvReplacer.replace(content, process.env);

      let parsed = JSON5.parse(content);

      // 处理对象中的环境变量替换和类型转换
      parsed = EnvReplacer.replaceInObject(parsed, process.env);

      // 验证并转换配置
      const config = this.validateConfig(parsed);

      // 解析路径配置（相对于 .kline 目录）
      const resolvedConfig = this.resolvePaths(config);

      logger.info(`Loaded config from ${configPath}`);
      return resolvedConfig;
    } catch (error) {
      logger.error(`Failed to load config: ${error}`);
      return this.createDefaultConfig();
    }
  }

  /**
   * 解析配置中的路径
   * 将所有相对路径转换为相对于 .kline 目录的绝对路径
   */
  private resolvePaths(config: UnifiedConfig): UnifiedConfig {
    const pathResolver = new PathResolver({ baseDir: KLINE_BASE_DIR });

    return {
      ...config,
      // 浏览器配置路径
      browser: {
        ...config.browser,
        profiles: Object.fromEntries(
          Object.entries(config.browser.profiles).map(([name, profile]) => [
            name,
            {
              ...profile,
              userDataDir: profile.userDataDir
                ? pathResolver.resolve(profile.userDataDir)
                : '',
              executablePath: profile.executablePath
                ? pathResolver.resolve(profile.executablePath)
                : '',
            },
          ]),
        ),
      },
    };
  }

  /**
   * 验证配置结构
   */
  private validateConfig(parsed: any): UnifiedConfig {
    // 合并默认值和解析的配置
    const mergedConfig = deepMerge(
      {
        server: DEFAULT_SERVER,
        redis: DEFAULT_REDIS,
        llm: DEFAULT_LLM,
        browser: DEFAULT_BROWSER,
        rateLimit: DEFAULT_RATE_LIMIT,
        analysis: DEFAULT_ANALYSIS,
        logging: DEFAULT_LOGGING,
      },
      parsed,
    );

    // 验证应用配置
    const appConfigData = {
      server: mergedConfig.server,
      redis: mergedConfig.redis,
      llm: mergedConfig.llm,
      rateLimit: mergedConfig.rateLimit,
      analysis: mergedConfig.analysis,
      logging: mergedConfig.logging,
    };

    const appConfigResult = appConfigSchema.safeParse(appConfigData);
    if (!appConfigResult.success) {
      logger.error('Invalid app config:', appConfigResult.error.format());
      throw new Error('Invalid app config');
    }

    // 验证浏览器配置
    const browserConfigData = {
      enabled: mergedConfig.browser?.enabled ?? true,
      defaultProfile: mergedConfig.browser?.defaultProfile ?? 'default',
      profiles: mergedConfig.browser?.profiles ?? {},
    };

    const browserConfigResult =
      browserConfigSchema.safeParse(browserConfigData);
    if (!browserConfigResult.success) {
      logger.error(
        'Invalid browser config:',
        browserConfigResult.error.format(),
      );
      throw new Error('Invalid browser config');
    }

    return {
      server: appConfigResult.data.server,
      redis: appConfigResult.data.redis,
      llm: appConfigResult.data.llm,
      browser: browserConfigResult.data,
      rateLimit: appConfigResult.data.rateLimit,
      analysis: appConfigResult.data.analysis,
      logging: appConfigResult.data.logging,
    };
  }

  /**
   * 创建默认配置
   */
  private createDefaultConfig(): UnifiedConfig {
    const config: UnifiedConfig = {
      server: { ...DEFAULT_SERVER },
      redis: { ...DEFAULT_REDIS },
      llm: { ...DEFAULT_LLM },
      browser: {
        enabled: DEFAULT_BROWSER.enabled,
        defaultProfile: DEFAULT_BROWSER.defaultProfile,
        profiles: {
          default: {
            ...DEFAULT_BROWSER.profiles.default,
            extraArgs: [...DEFAULT_BROWSER.profiles.default.extraArgs],
          },
        },
      },
      rateLimit: { ...DEFAULT_RATE_LIMIT },
      analysis: { ...DEFAULT_ANALYSIS },
      logging: { ...DEFAULT_LOGGING },
    };

    // 解析默认配置中的路径
    return this.resolvePaths(config);
  }

  /**
   * 获取环境变量配置
   */
  getEnv(): Env {
    if (!this.env) {
      this.loadEnv();
    }
    return this.env!;
  }

  /**
   * 获取统一配置
   */
  getConfig(): UnifiedConfig {
    if (!this.unifiedConfig) {
      this.loadUnifiedConfig();
    }
    return this.unifiedConfig!;
  }

  /**
   * 获取服务器配置
   */
  getServerConfig(): ServerConfig {
    return this.getConfig().server;
  }

  /**
   * 获取 Redis 配置
   */
  getRedisConfig(): RedisConfig {
    return this.getConfig().redis;
  }

  /**
   * 获取 LLM 配置
   */
  getLLMConfig(): LLMConfig {
    return this.getConfig().llm;
  }

  /**
   * 获取浏览器配置
   */
  getBrowserConfig(): BrowserConfig {
    return this.getConfig().browser;
  }

  /**
   * 获取浏览器配置文件
   */
  getBrowserProfile(name: string): BrowserProfile | undefined {
    const browserConfig = this.getBrowserConfig();
    return browserConfig.profiles[name];
  }

  /**
   * 获取速率限制配置
   */
  getRateLimitConfig(): RateLimitConfig | undefined {
    return this.getConfig().rateLimit;
  }

  /**
   * 获取分析配置
   */
  getAnalysisConfig(): AnalysisConfig | undefined {
    return this.getConfig().analysis;
  }

  /**
   * 获取日志配置
   */
  getLoggingConfig(): LoggingConfig | undefined {
    return this.getConfig().logging;
  }

  /**
   * 保存配置
   */
  saveConfig(config: Partial<UnifiedConfig>): void {
    const configPath = process.env.KLINE_CONFIG_FILE || KLINE_CONFIG_FILE;

    // 读取现有配置
    let existingConfig = {};
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      existingConfig = JSON5.parse(content);
    }

    // 合并配置
    const mergedConfig = {
      ...existingConfig,
      ...config,
    };

    // 确保目录存在
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 保存为 JSON5 格式
    const json5Content = JSON5.stringify(mergedConfig, null, 2);
    fs.writeFileSync(configPath, json5Content);
    logger.info(`Saved config to ${configPath}`);
  }
}

// 导出便捷函数
export function loadConfig() {
  return ConfigLoader.getInstance().loadAll();
}

export function getConfig() {
  return ConfigLoader.getInstance();
}

// 导出便捷访问器
export function getServerConfig() {
  return ConfigLoader.getInstance().getServerConfig();
}

export function getRedisConfig() {
  return ConfigLoader.getInstance().getRedisConfig();
}

export function getLLMConfig() {
  return ConfigLoader.getInstance().getLLMConfig();
}

export function getBrowserConfig() {
  return ConfigLoader.getInstance().getBrowserConfig();
}

// 导出默认值常量
export {
  DEFAULT_SERVER,
  DEFAULT_REDIS,
  DEFAULT_LLM,
  DEFAULT_BROWSER,
  DEFAULT_RATE_LIMIT,
  DEFAULT_ANALYSIS,
  DEFAULT_LOGGING,
  DEFAULT_ENV,
  KLINE_BASE_DIR,
} from './config-defaults.js';

// 导出路径解析器
export { PathResolver } from './path-resolver.js';
