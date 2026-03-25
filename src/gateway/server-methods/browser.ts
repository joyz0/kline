import type { Express, Request, Response } from 'express';
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
  params: BrowserRequestParams,
): Promise<any> {
  const { method, path, query, body } = params;

  const service = await startBrowserControlService();
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

export async function registerBrowserHandlers(app: Express) {
  app.get('/gateway/browser', async (_req: Request, res: Response) => {
    try {
      const service = await startBrowserControlService();

      res.json({
        success: true,
        port: service.port,
        message: 'Browser control service is running',
      });
    } catch (error) {
      browserLogger.error({ error }, 'Failed to start browser service');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/gateway/browser/request', async (req: Request, res: Response) => {
    try {
      const params = req.body as BrowserRequestParams;

      const result = await dispatchBrowserRequest(params);

      res.json(result);
    } catch (error) {
      browserLogger.error({ error }, 'Failed to process browser request');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/gateway/browser/stop', async (_req: Request, res: Response) => {
    try {
      await stopBrowserControlService();

      res.json({
        success: true,
        message: 'Browser control service stopped',
      });
    } catch (error) {
      browserLogger.error({ error }, 'Failed to stop browser service');

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
