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
    browserLogger.warn('Browser control service already running', {
      subsystem: 'browser',
    });

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
    browserLogger.error('Unhandled error', {
      error: err.message,
      subsystem: 'browser',
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  });

  const port = 18791;

  await new Promise<void>((resolve, reject) => {
    httpServer = app.listen(port, '127.0.0.1', (err?: Error) => {
      if (err) {
        reject(err);
        return;
      }

      browserLogger.info('Browser control service started', {
        port,
        host: '127.0.0.1',
        subsystem: 'browser',
      });
      resolve();
    });
  });

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
            browserLogger.info('Browser control service stopped', {
              subsystem: 'browser',
            });
            resolve();
          })
          .catch(reject);
      } else {
        browserLogger.info('Browser control service stopped', {
          subsystem: 'browser',
        });
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
