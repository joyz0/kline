/**
 * 日志常量配置
 */

/**
 * 默认日志模板
 */
export const DEFAULT_LOG_TEMPLATE =
  "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}.{{ms}} [{{logLevelName}}] {{filePathWithLineNumber}}";

/**
 * 默认错误堆栈模板
 */
export const DEFAULT_ERROR_STACK_TEMPLATE =
  "  • {{fileName}}\t{{method}}\n\t\t{{filePathWithLineNumber}}";

/**
 * 默认错误模板
 */
export const DEFAULT_ERROR_TEMPLATE =
  "\n{{errorName}} {{errorMessage}}\nerror:\n{{errorStack}}";

/**
 * 日志级别
 */
export enum LogLevel {
  Fatal = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
  Trace = 5,
}

/**
 * 从环境变量获取日志级别
 */
export function getLogLevelFromEnv(): number {
  return parseInt(process.env.LOG_LEVEL || "4", 10);
}
