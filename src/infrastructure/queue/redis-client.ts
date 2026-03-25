import { Redis } from 'ioredis';
import { ConfigLoader } from '../../config/index.js';
import { logger } from '../../logging/index.js';

const config = ConfigLoader.getInstance().getConfig();

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(
          { delay, times },
          `Redis connection retrying in ${delay}ms`,
        );
        return delay;
      },
    });

    redisClient.on('error', (err: Error) => {
      logger.error({ error: err }, 'Redis error');
    });

    redisClient.on('connect', () => {
      logger.info({ subsystem: 'redis' }, 'Connected to Redis');
    });
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info({ subsystem: 'redis' }, 'Redis connection closed');
  }
}
