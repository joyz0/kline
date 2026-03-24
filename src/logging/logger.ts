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

  debug(message: string | LogContext, context?: LogContext): void {
    if (typeof message === 'object') {
      this.logger.debug(message);
    } else if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }

  info(message: string | LogContext, context?: LogContext): void {
    if (typeof message === 'object') {
      this.logger.info(message);
    } else if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  warn(message: string | LogContext, context?: LogContext): void {
    if (typeof message === 'object') {
      this.logger.warn(message);
    } else if (context) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(message);
    }
  }

  error(message: string | LogContext | Error, context?: LogContext): void {
    if (message instanceof Error) {
      this.logger.error(message, context);
    } else if (typeof message === 'object') {
      this.logger.error(message);
    } else if (context) {
      this.logger.error(context, message);
    } else {
      this.logger.error(message);
    }
  }

  fatal(message: string | LogContext | Error, context?: LogContext): void {
    if (message instanceof Error) {
      this.logger.fatal(message, context);
    } else if (typeof message === 'object') {
      this.logger.fatal(message);
    } else if (context) {
      this.logger.fatal(context, message);
    } else {
      this.logger.fatal(message);
    }
  }

  trace(message: string | LogContext, context?: LogContext): void {
    if (typeof message === 'object') {
      this.logger.trace(message);
    } else if (context) {
      this.logger.trace(context, message);
    } else {
      this.logger.trace(message);
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
