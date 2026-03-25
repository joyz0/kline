/**
 * Logger 类实现
 */

import { Logger } from 'tslog';
import type { LogContext, LoggerOptions } from './types.js';
import {
  DEFAULT_LOG_TEMPLATE,
  DEFAULT_ERROR_STACK_TEMPLATE,
  DEFAULT_ERROR_TEMPLATE,
  getLogLevelFromEnv,
} from './constants.js';

/**
 * 基础日志配置
 */
const baseLoggerOptions = {
  minLevel: getLogLevelFromEnv(),
  prettyLogTemplate: DEFAULT_LOG_TEMPLATE,
  prettyLogTimeZone: 'local' as const,
  prettyErrorStackTemplate: DEFAULT_ERROR_STACK_TEMPLATE,
  prettyErrorTemplate: DEFAULT_ERROR_TEMPLATE,
  overwrite: {
    transportJSON: (message: unknown) => {
      console.log(JSON.stringify(message));
    },
  },
};

/**
 * 应用日志器类
 */
export class AppLogger {
  private logger: Logger<LogContext>;

  constructor(name: string, options: LoggerOptions = {}) {
    this.logger = new Logger({
      ...baseLoggerOptions,
      name: options.name || name,
      minLevel: options.minLevel ?? baseLoggerOptions.minLevel,
      prettyLogTemplate: options.prettyLogTemplate || DEFAULT_LOG_TEMPLATE,
    });
  }

  debug(context: LogContext, message?: string): void {
    if (message !== undefined) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(context);
    }
  }

  info(context: LogContext, message?: string): void {
    if (message !== undefined) {
      this.logger.info(context, message);
    } else {
      this.logger.info(context);
    }
  }

  warn(context: LogContext, message?: string): void {
    if (message !== undefined) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(context);
    }
  }

  error(context: LogContext | Error, message?: string): void {
    if (context instanceof Error) {
      this.logger.error(
        {
          error: context.stack || context.message,
        },
        context.message,
      );
    } else if (message !== undefined) {
      this.logger.error(context, message);
    } else {
      this.logger.error(context);
    }
  }

  fatal(context: LogContext | Error, message?: string): void {
    if (context instanceof Error) {
      this.logger.fatal(
        {
          error: context.stack || context.message,
        },
        context.message,
      );
    } else if (message !== undefined) {
      this.logger.fatal(context, message);
    } else {
      this.logger.fatal(context);
    }
  }

  trace(context: LogContext, message?: string): void {
    if (message !== undefined) {
      this.logger.trace(context, message);
    } else {
      this.logger.trace(context);
    }
  }

  /**
   * 创建子日志器（兼容旧的 pino/winston 调用方式）
   */
  child(bindings: LogContext): AppLogger {
    const childLogger = createLogger(
      `kline:${Object.values(bindings)[0] as string}`,
    );
    return childLogger;
  }
}

/**
 * 创建日志器实例
 */
export function createLogger(name: string, options?: LoggerOptions): AppLogger {
  return new AppLogger(name, options);
}
