import type { FastifyInstance } from 'fastify';
import { browserLogger } from '../../browser/logger.js';
import {
  startBrowserControlService,
  stopBrowserControlService,
} from '../../browser/control-service.js';

export interface BrowserRequestParams {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}

/**
 * 分发浏览器请求到具体的路由处理器
 */
export async function dispatchBrowserRequest(
  service: any,
  params: BrowserRequestParams,
): Promise<any> {
  const { method, path, query, body } = params;

  const url = new URL(path, `http://127.0.0.1:${service.port}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method.toUpperCase() !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);

  const responseBody = (await response.json()) as {
    message?: string;
    [key: string]: any;
  };

  if (!response.ok) {
    throw new Error(responseBody.message || `HTTP ${response.status}`);
  }

  return responseBody;
}

export async function registerBrowserHandlers(server: FastifyInstance) {
  server.get('/gateway/browser', async (_request, reply) => {
    try {
      const service = await startBrowserControlService();

      reply.send({
        success: true,
        port: service.port,
        message: 'Browser control service is running',
      });
    } catch (error) {
      browserLogger.error({ error }, 'Failed to start browser service');

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  server.post('/gateway/browser/request', async (request, reply) => {
    try {
      const params = request.body as BrowserRequestParams;

      const service = await startBrowserControlService();

      const result = await dispatchBrowserRequest(service, params);

      reply.send(result);
    } catch (error) {
      browserLogger.error({ error }, 'Failed to process browser request');

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  server.post('/gateway/browser/stop', async (_request, reply) => {
    try {
      await stopBrowserControlService();

      reply.send({
        success: true,
        message: 'Browser control service stopped',
      });
    } catch (error) {
      browserLogger.error({ error }, 'Failed to stop browser service');

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
