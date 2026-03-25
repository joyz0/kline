import type { FastifyInstance } from 'fastify';
import type { FastifyRequest } from 'fastify/types/request';
import type { SocketStream } from '@fastify/websocket';
import { logger } from '../../logging/index.js';
import { dispatchBrowserRequest } from '../server-methods/browser.js';

/**
 * WebSocket 消息接口
 */
interface WebSocketMessage {
  id: string;
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
}

/**
 * WebSocket 响应接口
 */
interface WebSocketResponse {
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
 * WebSocket 连接会话
 */
interface WebSocketSession {
  socket: any;
  connectedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
}

/**
 * WebSocket 会话管理器
 */
class WebSocketSessionManager {
  private sessions: Map<string, WebSocketSession> = new Map();
  private readonly maxIdleTime: number = 5 * 60 * 1000; // 5 分钟

  /**
   * 添加会话
   */
  addSession(sessionId: string, socket: any): void {
    const session: WebSocketSession = {
      socket,
      connectedAt: new Date(),
      lastMessageAt: new Date(),
      messageCount: 0,
    };
    
    this.sessions.set(sessionId, session);
    logger.info({ sessionId, subsystem: 'gateway', websocket: true }, 'WebSocket session created');
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): WebSocketSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 移除会话
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.info({ sessionId, subsystem: 'gateway', websocket: true }, 'WebSocket session removed');
  }

  /**
   * 更新会话活动
   */
  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastMessageAt = new Date();
      session.messageCount++;
    }
  }

  /**
   * 获取会话数量
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 清理空闲会话
   */
  cleanupIdleSessions(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const idleTime = now - session.lastMessageAt.getTime();
      
      if (idleTime > this.maxIdleTime) {
        try {
          if (session.socket.readyState === session.socket.OPEN) {
            session.socket.close(4000, 'Idle timeout');
          }
        } catch (error) {
          logger.warn({ sessionId, error }, 'Failed to close idle session');
        }
        
        this.sessions.delete(sessionId);
        cleaned++;
        logger.info({ sessionId, idleTime, subsystem: 'gateway', websocket: true }, 'Cleaned up idle session');
      }
    }

    return cleaned;
  }

  /**
   * 广播消息给所有连接
   */
  broadcast(message: any, filter?: (session: WebSocketSession) => boolean): void {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

    for (const session of this.sessions.values()) {
      try {
        if (!filter || filter(session)) {
          if (session.socket.readyState === session.socket.OPEN) {
            session.socket.send(messageStr);
          }
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to broadcast message');
      }
    }
  }
}

// 单例实例
const sessionManager = new WebSocketSessionManager();

/**
 * 获取 WebSocket 会话管理器
 */
export function getWebSocketSessionManager(): WebSocketSessionManager {
  return sessionManager;
}

/**
 * 设置浏览器 WebSocket 处理器
 */
export function setupBrowserWebSocket(server: FastifyInstance) {
  // 定期清理空闲会话（每 1 分钟）
  const cleanupInterval = setInterval(() => {
    const cleaned = sessionManager.cleanupIdleSessions();
    if (cleaned > 0) {
      logger.info({ cleaned, activeSessions: sessionManager.getSessionCount(), subsystem: 'gateway', websocket: true }, 'Cleaned up idle sessions');
    }
  }, 60000);

  // 确保服务器关闭时清理定时器
  server.addHook('onClose', async () => {
    clearInterval(cleanupInterval);
    logger.info({ subsystem: 'gateway', websocket: true }, 'WebSocket cleanup interval stopped');
  });

  // WebSocket 端点
  server.get('/gateway/browser/ws', { websocket: true }, async (connection: SocketStream, req: FastifyRequest) => {
    const { socket } = connection;
    const sessionId = generateSessionId();
    
    logger.info(
      { sessionId, subsystem: 'gateway', websocket: true },
      'Browser WebSocket connection established'
    );

    // 创建会话
    sessionManager.addSession(sessionId, socket);

    // 发送连接成功消息
    sendWebSocketResponse(socket, {
      id: 'connection',
      success: true,
      result: {
        sessionId,
        message: 'Connected to browser gateway',
        timestamp: new Date().toISOString(),
      },
    });

    // 心跳定时器（每 30 秒发送 ping）
    const heartbeatInterval = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    }, 30000);

    // 消息处理
    socket.on('message', async (message: Buffer) => {
      try {
        // 更新会话活动
        sessionManager.updateActivity(sessionId);

        // 解析消息
        let msg: WebSocketMessage;
        try {
          msg = JSON.parse(message.toString());
        } catch (error) {
          sendWebSocketError(socket, {
            id: 'parse',
            code: 400,
            message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          return;
        }

        // 验证消息格式
        if (!msg.id || !msg.method || !msg.path) {
          sendWebSocketError(socket, {
            id: msg.id || 'unknown',
            code: 400,
            message: 'Missing required fields: id, method, path',
          });
          return;
        }

        logger.info(
          { sessionId, messageId: msg.id, method: msg.method, path: msg.path, subsystem: 'gateway', websocket: true },
          'Received browser request via WebSocket'
        );

        // 处理请求
        const result = await dispatchBrowserRequest({
          method: msg.method,
          path: msg.path,
          query: msg.query,
          body: msg.body,
          timeoutMs: msg.timeoutMs,
        });

        // 发送成功响应
        sendWebSocketResponse(socket, {
          id: msg.id,
          success: true,
          result,
        });

      } catch (error) {
        logger.error(
          { sessionId, error, subsystem: 'gateway', websocket: true },
          'WebSocket message processing failed'
        );

        // 发送错误响应
        sendWebSocketError(socket, {
          id: (JSON.parse(message.toString()) as WebSocketMessage)?.id || 'unknown',
          code: 500,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    });

    // 连接关闭处理
    socket.on('close', () => {
      clearInterval(heartbeatInterval);
      sessionManager.removeSession(sessionId);
      logger.info({ sessionId, subsystem: 'gateway', websocket: true }, 'WebSocket connection closed');
    });

    // 错误处理
    socket.on('error', (error: Error) => {
      logger.error(
        { sessionId, error, subsystem: 'gateway', websocket: true },
        'WebSocket error'
      );
    });
  });

  // 获取会话统计端点
  server.get('/gateway/browser/ws/stats', async (request, reply) => {
    return {
      activeSessions: sessionManager.getSessionCount(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  logger.info({ subsystem: 'gateway', websocket: true }, 'Browser WebSocket handler registered');
}

/**
 * 生成会话 ID
 */
function generateSessionId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 发送 WebSocket 响应
 */
function sendWebSocketResponse(socket: any, response: WebSocketResponse): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(response));
  }
}

/**
 * 发送 WebSocket 错误
 */
function sendWebSocketError(socket: any, error: { id: string; code: number; message: string; stack?: string }): void {
  sendWebSocketResponse(socket, {
    id: error.id,
    success: false,
    error: {
      code: error.code,
      message: error.message,
      stack: error.stack,
    },
  });
}

/**
 * 广播系统消息
 */
export function broadcastSystemMessage(message: any): void {
  sessionManager.broadcast({
    type: 'system',
    ...message,
    timestamp: new Date().toISOString(),
  });
}
