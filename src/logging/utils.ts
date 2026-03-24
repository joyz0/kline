/**
 * 日志工具函数
 */

import type { AppLogger } from './logger.js';
import type { LogContext } from './types.js';

/**
 * 兼容旧的日志调用方式 - 允许对象作为第一个参数
 */
export function logWithObjectParam(
  method: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'trace',
  logger: AppLogger,
  context: LogContext,
  message?: string,
): void {
  if (message) {
    logger[method](message, context);
  } else {
    logger[method](context);
  }
}

/**
 * 记录 HTTP 请求日志
 */
export function logRequest(
  logger: AppLogger,
  method: string,
  path: string,
  status: number,
  duration: number,
): void {
  logger.info(`${method} ${path} ${status}`, {
    method,
    path,
    status,
    duration: `${duration}ms`,
  });
}

/**
 * 记录错误日志
 */
export function logError(
  logger: AppLogger,
  error: Error,
  context?: Record<string, unknown>,
): void {
  logger.error(error.message, {
    error: error.stack || error.message,
    ...context,
  });
}
