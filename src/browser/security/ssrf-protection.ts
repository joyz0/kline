import { InvalidUrlError } from '../errors.js';

const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
];

const LOCALHOST_PATTERNS = [
  /^localhost$/i,
  /^localhost\./i,
  /\.localhost$/i,
  /^127\./,
  /^\[::1\]$/,
  /^::1$/,
  /^\[::\]$/,
  /^::$/,
];

export function validateUrl(url: string, options?: { allowPrivate?: boolean }): boolean {
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new InvalidUrlError(url);
    }

    if (options?.allowPrivate) {
      return true;
    }

    if (isPrivateIP(parsed.hostname)) {
      throw new InvalidUrlError(url);
    }

    return true;
  } catch (error) {
    if (error instanceof InvalidUrlError) {
      throw error;
    }
    return false;
  }
}

export function isPrivateIP(hostname: string): boolean {
  const ip = hostname.toLowerCase();

  for (const pattern of LOCALHOST_PATTERNS) {
    if (pattern.test(ip)) {
      return true;
    }
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(ip)) {
      return true;
    }
  }

  return false;
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    parsed.hash = '';
    
    const params = parsed.searchParams;
    const sensitiveParams = ['token', 'password', 'secret', 'key', 'api_key', 'apikey'];
    
    for (const param of sensitiveParams) {
      if (params.has(param)) {
        params.delete(param);
      }
    }
    
    return parsed.toString();
  } catch {
    return url;
  }
}

export function createUrlValidator(allowedProtocols?: string[]) {
  const protocols = allowedProtocols || ['http:', 'https:'];
  
  return (url: string): boolean => {
    try {
      const parsed = new URL(url);
      
      if (!protocols.includes(parsed.protocol)) {
        return false;
      }
      
      if (isPrivateIP(parsed.hostname)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  };
}
