import type { Request, Response, NextFunction } from 'express';

/**
 * 超时控制中间件
 * 
 * 为每个请求添加超时控制，防止长时间阻塞
 */
export function createTimeoutMiddleware(defaultTimeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 从查询参数或请求头获取超时时间
    const timeout = req.query.timeout as string | undefined;
    const timeoutFromHeader = req.headers['x-request-timeout'] as string | undefined;
    
    const timeoutMs = timeout 
      ? parseInt(timeout, 10) 
      : timeoutFromHeader 
        ? parseInt(timeoutFromHeader, 10)
        : defaultTimeout;

    // 验证超时时间
    if (isNaN(timeoutMs) || timeoutMs <= 0) {
      return res.status(400).json({
        error: 'Invalid timeout',
        message: 'Timeout must be a positive number',
      });
    }

    // 创建 AbortController 用于取消操作
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      
      // 如果响应还未发送，发送超时错误
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request Timeout',
          message: `Request exceeded ${timeoutMs}ms timeout`,
          code: 'REQUEST_TIMEOUT',
        });
      }
    }, timeoutMs);

    // 清理函数
    const cleanup = () => {
      clearTimeout(timeoutId);
    };

    // 在响应完成或关闭时清理
    res.on('finish', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);

    // 将 signal 和 timeoutMs 附加到 request 对象
    (req as any).signal = controller.signal;
    (req as any).timeoutMs = timeoutMs;
    (req as any).abortController = controller;

    // 添加取消请求的方法
    res.locals.cancelRequest = () => {
      controller.abort();
      cleanup();
    };

    next();
  };
}

/**
 * 异步操作超时包装器
 * 
 * @param operation 异步操作
 * @param timeoutMs 超时时间
 * @param operationName 操作名称（用于错误信息）
 */
export async function withRequestTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation',
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const result = await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
        });
      }),
    ]);

    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 可取消的异步操作包装器
 * 
 * @param operation 异步操作
 * @param signal AbortSignal
 * @param operationName 操作名称
 */
export async function withCancellation<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
  operationName: string = 'Operation',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // 检查是否已取消
    if (signal.aborted) {
      reject(new Error(`${operationName} was cancelled`));
      return;
    }

    // 监听取消事件
    const abortHandler = () => {
      reject(new Error(`${operationName} was cancelled`));
    };

    signal.addEventListener('abort', abortHandler, { once: true });

    // 执行操作
    operation()
      .then((result) => {
        signal.removeEventListener('abort', abortHandler);
        resolve(result);
      })
      .catch((error) => {
        signal.removeEventListener('abort', abortHandler);
        reject(error);
      });
  });
}
