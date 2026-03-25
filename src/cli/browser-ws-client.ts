import WebSocket from 'ws';
import { logger } from '../logging/index.js';

/**
 * WebSocket 请求参数
 */
interface BrowserWebSocketRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  timeoutMs?: number;
}

/**
 * WebSocket 响应
 */
interface BrowserWebSocketResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: {
    code: number;
    message: string;
    stack?: string;
  };
}

/**
 * 通过 WebSocket 调用浏览器服务
 * 
 * @param params 请求参数
 * @returns 响应结果
 */
export async function callBrowserRequestViaWebSocket(
  params: BrowserWebSocketRequest,
): Promise<any> {
  const gatewayPort = process.env.GATEWAY_PORT || '18789';
  const wsUrl = `ws://127.0.0.1:${gatewayPort}/gateway/browser/ws`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const requestId = crypto.randomUUID();

    // 超时定时器
    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      reject(new Error(`Request timeout after ${params.timeoutMs || 30000}ms`));
    }, params.timeoutMs || 30000);

    // 连接建立
    ws.on('open', () => {
      logger.info({ wsUrl, requestId }, 'WebSocket connection opened');

      // 构建消息
      const message: any = {
        id: requestId,
        method: params.method,
        path: params.path,
      };

      if (params.query) {
        message.query = params.query;
      }

      if (params.body) {
        message.body = params.body;
      }

      if (params.timeoutMs) {
        message.timeoutMs = params.timeoutMs;
      }

      // 发送消息
      ws.send(JSON.stringify(message));
    });

    // 接收消息
    ws.on('message', (data: Buffer) => {
      try {
        const response: BrowserWebSocketResponse = JSON.parse(data.toString());

        // 只处理匹配的响应
        if (response.id !== requestId) {
          return;
        }

        // 清除超时
        clearTimeout(timeout);

        if (response.success) {
          logger.info({ requestId, subsystem: 'cli', websocket: true }, 'WebSocket request succeeded');
          resolve(response.result);
        } else {
          const error = new Error(response.error?.message || 'Unknown error');
          (error as any).code = response.error?.code;
          (error as any).stack = response.error?.stack;
          logger.error({ requestId, error, subsystem: 'cli', websocket: true }, 'WebSocket request failed');
          reject(error);
        }

        // 关闭连接
        ws.close();
      } catch (error) {
        logger.error({ error, data: data.toString(), subsystem: 'cli', websocket: true }, 'Failed to parse WebSocket response');
        reject(new Error('Invalid response format'));
      }
    });

    // 连接错误
    ws.on('error', (error: Error) => {
      clearTimeout(timeout);
      logger.error({ error, subsystem: 'cli', websocket: true }, 'WebSocket connection error');
      reject(error);
    });

    // 连接关闭
    ws.on('close', (code: number, reason: Buffer) => {
      if (ws.readyState === WebSocket.CLOSED && code !== 1000) {
        logger.warn({ code, reason: reason.toString(), subsystem: 'cli', websocket: true }, 'WebSocket connection closed unexpectedly');
      }
    });
  });
}

/**
 * 带重试的 WebSocket 调用
 * 
 * @param params 请求参数
 * @param maxRetries 最大重试次数
 * @returns 响应结果
 */
export async function callBrowserRequestWithRetry(
  params: BrowserWebSocketRequest,
  maxRetries: number = 2,
): Promise<any> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await callBrowserRequestViaWebSocket(params);
    } catch (error) {
      lastError = error as Error;

      // 如果是最后一次尝试，直接抛出
      if (attempt === maxRetries + 1) {
        break;
      }

      // 检查是否是可重试的错误
      const errorMessage = error instanceof Error ? error.message : '';
      const isRetryable = 
        errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('WebSocket');

      if (!isRetryable) {
        throw error;
      }

      // 等待后重试
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      logger.warn(
        { attempt, maxRetries, delay, error: errorMessage, subsystem: 'cli', websocket: true },
        'WebSocket request failed, retrying...'
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * 测试 WebSocket 连接
 * 
 * @returns 连接状态
 */
export async function testWebSocketConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const gatewayPort = process.env.GATEWAY_PORT || '18789';
  const wsUrl = `ws://127.0.0.1:${gatewayPort}/gateway/browser/ws`;
  const startTime = Date.now();

  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      resolve({
        connected: false,
        error: 'Connection timeout',
      });
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      ws.close();
      resolve({
        connected: true,
        latency,
      });
    });

    ws.on('error', (error: Error) => {
      clearTimeout(timeout);
      resolve({
        connected: false,
        error: error.message,
      });
    });
  });
}
