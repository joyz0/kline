import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { logger } from '../logging/index.js';
import { registerAnalysisRoutes } from './routes/analysis.route.js';
import { registerReportRoutes } from './routes/report.route.js';
import { setupWebSocket } from './websocket/progress-handler.js';
import { setupBrowserWebSocket } from './websocket/browser-ws.js';
import { closeRedis } from '../infrastructure/queue/redis-client.js';
import { registerBrowserHandlers } from './server-methods/browser.js';

export async function buildServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: false, // 我们使用自己的 logger
  });

  // 注册插件
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  await server.register(websocket);

  // 注册路由
  await registerAnalysisRoutes(server);
  await registerReportRoutes(server);
  await setupWebSocket(server);
  await setupBrowserWebSocket(server);
  await registerBrowserHandlers(server);

  // 健康检查
  server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // 错误处理
  server.setErrorHandler((error, request, reply) => {
    logger.error(
      { error, path: request.url, subsystem: 'gateway' },
      'Request error',
    );

    reply.status(error.statusCode || 500).send({
      error: error.name,
      message: error.message,
      statusCode: error.statusCode || 500,
    });
  });

  // 优雅关闭
  server.addHook('onClose', async () => {
    await closeRedis();
    logger.info({ subsystem: 'gateway' }, 'Server closed');
  });

  return server;
}
