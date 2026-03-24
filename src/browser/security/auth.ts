import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { browserLogger } from '../logger.js';

export interface AuthConfig {
  enabled: boolean;
  secret?: string;
  apiKeyHeader?: string;
  tokenHeader?: string;
}

const DEFAULT_CONFIG: AuthConfig = {
  enabled: false,
  apiKeyHeader: 'x-api-key',
  tokenHeader: 'authorization',
};

export function createAuthMiddleware(config: AuthConfig = DEFAULT_CONFIG) {
  const authConfig: Required<AuthConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
    secret: config.secret || process.env.BROWSER_API_SECRET || generateApiKey(),
    apiKeyHeader: config.apiKeyHeader || DEFAULT_CONFIG.apiKeyHeader!,
    tokenHeader: config.tokenHeader || DEFAULT_CONFIG.tokenHeader!,
  };

  if (!authConfig.enabled) {
    return (_req: Request, _res: Response, next: NextFunction) => {
      next();
    };
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers[authConfig.apiKeyHeader] as string | undefined;
    const authHeader = req.headers[authConfig.tokenHeader] as
      | string
      | undefined;

    let token: string | undefined;

    if (apiKey) {
      token = apiKey;
    } else if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      browserLogger.warn('Unauthorized access attempt - no token', {
        path: req.path,
        method: req.method,
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Provide API key or Bearer token.',
        code: 'AUTH_MISSING',
      });
    }

    if (!constantTimeCompare(token, authConfig.secret)) {
      browserLogger.warn('Unauthorized access attempt - invalid token', {
        path: req.path,
        method: req.method,
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token.',
        code: 'AUTH_INVALID',
      });
    }

    next();
  };
}

function constantTimeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < aBuffer.length; i++) {
    result |= aBuffer[i] ^ bBuffer[i];
  }

  return result === 0;
}

export function generateApiKey(): string {
  return randomUUID();
}

export function createApiKey(): { key: string; createdAt: number } {
  return {
    key: generateApiKey(),
    createdAt: Date.now(),
  };
}

export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  enabled: true,
  maxRequests: 100,
  windowMs: 60000,
};

export function createRateLimitMiddleware(
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
) {
  const rateLimitConfig: Required<RateLimitConfig> = {
    ...DEFAULT_RATE_LIMIT,
    ...config,
  };

  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  if (!rateLimitConfig.enabled) {
    return (req: Request, res: Response, next: NextFunction) => {
      next();
    };
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientIdentifier(req);
    const now = Date.now();

    let clientData = requestCounts.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      clientData = {
        count: 0,
        resetTime: now + rateLimitConfig.windowMs,
      };
      requestCounts.set(clientId, clientData);
    }

    clientData.count++;

    res.setHeader('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, rateLimitConfig.maxRequests - clientData.count).toString(),
    );
    res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());

    if (clientData.count > rateLimitConfig.maxRequests) {
      browserLogger.warn('Rate limit exceeded', {
        clientId,
        path: req.path,
        count: clientData.count,
      });

      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${rateLimitConfig.maxRequests} requests per ${rateLimitConfig.windowMs / 1000} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      });
    }

    next();
  };
}

function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey) {
    return `key:${apiKey.substring(0, 8)}...`;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function createSecurityHeadersMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );

    next();
  };
}
