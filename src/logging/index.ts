import { Logger } from "tslog";

export interface LogContext {
  [key: string]: unknown;
}

export interface LoggerOptions {
  name?: string;
  minLevel?: number;
  prettyLogTemplate?: string;
}

const defaultPrettyLogTemplate =
  "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}.{{ms}} [{{logLevelName}}] {{filePathWithLineNumber}}";

const baseLoggerOptions = {
  minLevel: parseInt(process.env.LOG_LEVEL || "4", 10),
  prettyLogTemplate: defaultPrettyLogTemplate,
  prettyLogTimeZone: "local",
  prettyErrorStackTemplate: "  • {{fileName}}\t{{method}}\n\t\t{{filePathWithLineNumber}}",
  prettyErrorTemplate: "\n{{errorName}} {{errorMessage}}\nerror:\n{{errorStack}}",
  overwrite: {
    transportJSON: (message: unknown) => {
      console.log(JSON.stringify(message));
    },
  },
};

export class AppLogger {
  private logger: Logger;

  constructor(name: string, options: LoggerOptions = {}) {
    this.logger = new Logger({
      ...baseLoggerOptions,
      name: options.name || name,
      minLevel: options.minLevel ?? baseLoggerOptions.minLevel,
      prettyLogTemplate: options.prettyLogTemplate || defaultPrettyLogTemplate,
    });
  }

  debug(message: string | LogContext, context?: LogContext): void {
    if (typeof message === "object") {
      this.logger.debug(message);
    } else if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }

  info(message: string | LogContext, context?: LogContext): void {
    if (typeof message === "object") {
      this.logger.info(message);
    } else if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  warn(message: string | LogContext, context?: LogContext): void {
    if (typeof message === "object") {
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
    } else if (typeof message === "object") {
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
    } else if (typeof message === "object") {
      this.logger.fatal(message);
    } else if (context) {
      this.logger.fatal(context, message);
    } else {
      this.logger.fatal(message);
    }
  }

  trace(message: string | LogContext, context?: LogContext): void {
    if (typeof message === "object") {
      this.logger.trace(message);
    } else if (context) {
      this.logger.trace(context, message);
    } else {
      this.logger.trace(message);
    }
  }

  // 兼容旧的 pino/winston 调用方式
  child(bindings: LogContext): AppLogger {
    const childLogger = createLogger(`kline:${Object.values(bindings)[0] as string}`);
    return childLogger;
  }
}

// 兼容旧的日志调用方式 - 允许对象作为第一个参数
export function logWithObjectParam(
  method: "debug" | "info" | "warn" | "error" | "fatal" | "trace",
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

export function createLogger(name: string, options?: LoggerOptions): AppLogger {
  return new AppLogger(name, options);
}

export const logger = createLogger("kline");

export function logRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
) {
  logger.info(`${method} ${path} ${status}`, {
    method,
    path,
    status,
    duration: `${duration}ms`,
  });
}

export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error(error.message, {
    error: error.stack || error.message,
    ...context,
  });
}
