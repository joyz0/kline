import { logger } from '../logging/index.js';

const ENV_PATTERN = /\$\{env:([^}]+)\}/g;

export interface EnvReplacerOptions {
  strict?: boolean;
}

export class EnvReplacer {
  private env: Record<string, string | undefined>;
  private strict: boolean;

  constructor(
    env: Record<string, string | undefined> = process.env,
    options: EnvReplacerOptions = {},
  ) {
    this.env = env;
    this.strict = options.strict ?? false;
  }

  replace(content: string): string {
    return content.replace(ENV_PATTERN, (match, variableName) => {
      const value = this.env[variableName.trim()];

      if (value === undefined) {
        if (this.strict) {
          throw new Error(
            `Environment variable "${variableName}" is not defined`,
          );
        }
        // 环境变量未定义时返回空字符串，让 Zod 验证使用默认值
        return '';
      }

      return value;
    });
  }

  replaceInObject<T extends Record<string, any>>(obj: T): T {
    const result: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const replaced = this.replace(value);
        result[key] = this.autoConvertType(replaced);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.replaceInObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private autoConvertType(value: string): string | number | boolean {
    if (typeof value !== 'string') {
      return value;
    }

    if (value === '') {
      return value;
    }

    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }

    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }

    return value;
  }

  static replace(
    content: string,
    env: Record<string, string | undefined> = process.env,
  ): string {
    const replacer = new EnvReplacer(env);
    return replacer.replace(content);
  }

  static replaceInObject<T extends Record<string, any>>(
    obj: T,
    env: Record<string, string | undefined> = process.env,
  ): T {
    const replacer = new EnvReplacer(env);
    return replacer.replaceInObject(obj);
  }
}
