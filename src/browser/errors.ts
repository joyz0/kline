export class BrowserError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "BrowserError";
    this.code = code;
    this.status = status;
  }
}

export class BrowserProfileUnavailableError extends BrowserError {
  constructor(profileName: string) {
    super(
      "PROFILE_UNAVAILABLE",
      503,
      `Browser profile "${profileName}" is not available`,
    );
  }
}

export class BrowserTabNotFoundError extends BrowserError {
  constructor(targetId: string) {
    super("TAB_NOT_FOUND", 404, `Tab "${targetId}" not found`);
  }
}

export class BrowserNotStartedError extends BrowserError {
  constructor(profileName: string) {
    super(
      "BROWSER_NOT_STARTED",
      503,
      `Browser for profile "${profileName}" is not started`,
    );
  }
}

export class InvalidUrlError extends BrowserError {
  constructor(url: string) {
    super("INVALID_URL", 400, `Invalid URL: ${url}`);
  }
}

export class ElementNotFoundError extends BrowserError {
  constructor(ref: string) {
    super("ELEMENT_NOT_FOUND", 404, `Element with ref "${ref}" not found`);
  }
}

/**
 * 可重试的错误
 * 
 * 用于标记可以重试的操作失败
 */
export class RetryableError extends Error {
  public readonly retryAfter: number;
  public readonly maxRetries: number;
  public readonly attempt: number;

  constructor(
    message: string,
    options: {
      retryAfter?: number;
      maxRetries?: number;
      attempt?: number;
    } = {},
  ) {
    super(message);
    this.name = 'RetryableError';
    this.retryAfter = options.retryAfter ?? 1000;
    this.maxRetries = options.maxRetries ?? 3;
    this.attempt = options.attempt ?? 1;
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends RetryableError {
  constructor(
    message: string = 'Operation timed out',
    options: {
      retryAfter?: number;
      maxRetries?: number;
      attempt?: number;
    } = {},
  ) {
    super(message, options);
    this.name = 'TimeoutError';
  }
}

/**
 * 连接错误
 */
export class ConnectionError extends RetryableError {
  constructor(
    message: string,
    options: {
      retryAfter?: number;
      maxRetries?: number;
      attempt?: number;
    } = {},
  ) {
    super(message, options);
    this.name = 'ConnectionError';
  }
}

/**
 * 带重试的操作执行函数
 * 
 * @param operation 要执行的操作
 * @param options 重试配置
 * @returns 操作结果
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // 检查是否应该重试
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      // 如果不是可重试的错误，直接抛出
      if (!(lastError instanceof RetryableError)) {
        // 检查错误名称，判断是否可重试
        const retryableErrors = [
          'TimeoutError',
          'ConnectionError',
          'ETIMEDOUT',
          'ECONNREFUSED',
          'ECONNRESET',
        ];
        
        const isRetryable = retryableErrors.some(
          name => lastError.name.includes(name) || lastError.message.includes(name)
        );

        if (!isRetryable) {
          throw lastError;
        }
      }

      // 如果是最后一次尝试，直接抛出
      if (attempt === maxRetries) {
        throw lastError;
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * 带超时的操作执行函数
 * 
 * @param operation 要执行的操作
 * @param timeoutMs 超时时间（毫秒）
 * @param options 重试配置
 * @returns 操作结果
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 30000,
  options?: Parameters<typeof withRetry>[1],
): Promise<T> {
  return withRetry(
    async () => {
      return Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    },
    options,
  );
}
