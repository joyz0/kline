/**
 * 日志类型定义
 */

/**
 * 日志上下文
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * 日志器配置选项
 */
export interface LoggerOptions {
  name?: string;
  minLevel?: number;
  prettyLogTemplate?: string;
}
