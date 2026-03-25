import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import type { Server } from 'http';
import { browserLogger, logRequest } from './logger.js';
import { loadBrowserConfig } from './config.js';
import { ProfileManager } from './profiles/manager.js';
import { registerBasicRoutes } from './routes/basic.js';
import { registerTabsRoutes } from './routes/tabs.js';
import { registerAgentRoutes } from './routes/agent.js';
import {
  createAuthMiddleware,
  createRateLimitMiddleware,
  createSecurityHeadersMiddleware,
} from './security/index.js';
import { createTimeoutMiddleware } from './middleware/timeout.js';
import { withTimeout, TimeoutError, ConnectionError } from './errors.js';

let httpServer: Server | null = null;
let expressApp: Express | null = null;
let profileManager: ProfileManager | null = null;

export interface BrowserServiceState {
  server: Express;
  port: number;
  profileManager: ProfileManager;
}

export async function startBrowserControlService(): Promise<BrowserServiceState> {
  if (httpServer) {
    browserLogger.warn(
      { subsystem: 'browser' },
      'Browser control service already running',
    );

    return {
      server: expressApp!,
      port: 18791,
      profileManager: profileManager!,
    };
  }

  const config = loadBrowserConfig();

  if (!config.enabled) {
    throw new Error('Browser control is disabled in configuration');
  }

  const app = express();

  app.use(express.json());

  app.use(createSecurityHeadersMiddleware());

  // 添加超时中间件（默认 30 秒）
  app.use(createTimeoutMiddleware(30000));

  const securityConfig = config.security;

  app.use(
    createRateLimitMiddleware({
      enabled: securityConfig?.rateLimitEnabled ?? true,
      maxRequests: securityConfig?.rateLimitMaxRequests ?? 100,
      windowMs: securityConfig?.rateLimitWindowMs ?? 60000,
    }),
  );

  app.use(
    createAuthMiddleware({
      enabled: securityConfig?.authEnabled ?? false,
      secret: securityConfig?.authSecret || process.env.BROWSER_API_SECRET,
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;

      logRequest(req.method, req.path, res.statusCode, duration);
    });

    next();
  });

  profileManager = new ProfileManager(Object.values(config.profiles));

  registerBasicRoutes(app, profileManager);
  registerTabsRoutes(app, profileManager);
  registerAgentRoutes(app, profileManager);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    browserLogger.error(
      { error: err.message, subsystem: 'browser' },
      'Unhandled error',
    );

    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  });

  const port = 18791;

  // 使用超时和重试机制启动服务
  await withTimeout(
    async () => {
      return new Promise<void>((resolve, reject) => {
        httpServer = app.listen(port, '127.0.0.1', (err?: Error) => {
          if (err) {
            reject(new ConnectionError(`Failed to start browser service: ${err.message}`));
            return;
          }

          browserLogger.info(
            {
              port,
              host: '127.0.0.1',
              subsystem: 'browser',
            },
            'Browser control service started',
          );
          resolve();
        });
        
        // 监听错误
        httpServer!.once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            reject(new ConnectionError(`Port ${port} is already in use`, { retryAfter: 2000 }));
          } else {
            reject(new ConnectionError(`Server error: ${err.message}`));
          }
        });
      });
    },
    10000, // 10 秒超时
    {
      maxRetries: 2,
      initialDelay: 1000,
      shouldRetry: (error) => {
        // 只在端口被占用或连接错误时重试
        return error instanceof ConnectionError || error.message.includes('EADDRINUSE');
      },
    },
  );

  expressApp = app;

  return {
    server: app,
    port,
    profileManager,
  };
}

export async function stopBrowserControlService(): Promise<void> {
  if (!httpServer) {
    return;
  }

  return new Promise((resolve, reject) => {
    httpServer!.close((err?: Error) => {
      if (err) {
        reject(err);
        return;
      }

      httpServer = null;
      expressApp = null;

      if (profileManager) {
        profileManager
          .stopAll()
          .then(() => {
            profileManager = null;
            browserLogger.info(
              { subsystem: 'browser' },
              'Browser control service stopped',
            );
            resolve();
          })
          .catch(reject);
      } else {
        browserLogger.info(
          { subsystem: 'browser' },
          'Browser control service stopped',
        );
        resolve();
      }
    });
  });
}

export function getProfileManager(): ProfileManager | null {
  return profileManager;
}

export async function getProfileContext(profileName: string) {
  if (!profileManager) {
    throw new Error('Profile manager not initialized');
  }

  const profile = profileManager.getProfile(profileName);

  if (!profile) {
    throw new Error(`Profile "${profileName}" not found`);
  }

  const { ProfileContext } = await import('./profiles/manager.js');

  return new ProfileContext(profile, profileManager);
}
