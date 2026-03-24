/**
 * Logging 模块
 *
 * 提供统一的日志记录功能
 */

export { AppLogger, createLogger } from './logger.js';
export type { LogContext, LoggerOptions } from './types.js';
export {
  DEFAULT_LOG_TEMPLATE,
  DEFAULT_ERROR_STACK_TEMPLATE,
  DEFAULT_ERROR_TEMPLATE,
  LogLevel,
  getLogLevelFromEnv,
} from './constants.js';
export { logWithObjectParam, logRequest, logError } from './utils.js';

// 创建默认日志器实例
import { createLogger } from './logger.js';
export const logger = createLogger('kline');
