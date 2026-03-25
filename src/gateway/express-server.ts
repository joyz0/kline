import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { createServer, type Server } from 'http';
import { WebSocketServer, type WebSocketServer as WSServer } from 'ws';
import cors from 'cors';
import { logger } from '../logging/index.js';
import { registerAnalysisRoutes } from './routes/analysis.route.js';
import { registerReportRoutes } from './routes/report.route.js';
import { setupWebSocket } from './websocket/progress-handler.js';
import {
  setupBrowserWebSocket,
  stopBrowserWebSocket,
} from './websocket/browser-ws.js';
import { closeRedis } from '../infrastructure/queue/redis-client.js';
import { registerBrowserHandlers } from './server-methods/browser.js';

export interface ExpressServer {
  app: Express;
  httpServer: Server;
  wsServer: WSServer;
  port: number;
}

export async function buildExpressServer(): Promise<ExpressServer> {
  const app = express();
  const httpServer = createServer(app);

  const port = parseInt(process.env.PORT || '3000', 10);

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  app.use(express.json());

  await registerAnalysisRoutes(app);
  await registerReportRoutes(app);
  await registerBrowserHandlers(app);

  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(
      { error: err.message, path: _req.path, subsystem: 'gateway' },
      'Request error',
    );

    res.status((err as any).statusCode || 500).json({
      error: err.name,
      message: err.message,
      statusCode: (err as any).statusCode || 500,
    });
  });

  return new Promise((resolve, reject) => {
    httpServer.listen(port, '0.0.0.0', (err?: Error) => {
      if (err) {
        reject(err);
        return;
      }

      const wsServer = new WebSocketServer({ server: httpServer });

      setupWebSocket(wsServer);
      setupBrowserWebSocket(wsServer);

      logger.info({ port, subsystem: 'gateway' }, 'Express server started');

      resolve({
        app,
        httpServer,
        wsServer,
        port,
      });
    });

    httpServer.once('error', (err: any) => {
      reject(err);
    });
  });
}

export async function closeExpressServer(server: ExpressServer): Promise<void> {
  return new Promise((resolve, reject) => {
    stopBrowserWebSocket(server.wsServer);

    server.httpServer.close((err?: Error) => {
      if (err) {
        reject(err);
        return;
      }

      server.wsServer.close((err?: Error) => {
        if (err) {
          reject(err);
          return;
        }

        closeRedis();
        logger.info({ subsystem: 'gateway' }, 'Express server closed');
        resolve();
      });
    });
  });
}
