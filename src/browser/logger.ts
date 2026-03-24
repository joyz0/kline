/**
 * 浏览器模块日志器
 * 
 * 使用 logger.child() 创建子系统日志器
 */

import { logger, logRequest as utilsLogRequest, logError as utilsLogError } from '../logging/index.js';

// 创建浏览器服务专用的日志器
export const browserLogger = logger.child({ subsystem: 'browser' });

// 导出工具函数（绑定到 browserLogger）
export function logRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
) {
  utilsLogRequest(browserLogger, method, path, status, duration);
}

export function logError(error: Error, context?: Record<string, unknown>) {
  utilsLogError(browserLogger, error, context);
}

export type { AppLogger, LogContext } from '../logging/index.js';

