import { getRedisClient } from '../queue/redis-client.js';
import type { AnalysisReport } from '../../types/index.js';
import { logger } from '../../logging/index.js';

export class ResultCache {
  private redis = getRedisClient();
  private readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

  private generateCacheKey(date: string, newsHash: string): string {
    return `analysis:${date}:${newsHash}`;
  }

  async get(date: string, newsHash: string): Promise<AnalysisReport | null> {
    try {
      const key = this.generateCacheKey(date, newsHash);
      const cached = await this.redis.get(key);

      if (cached) {
        logger.info({ key }, 'Cache hit');
        return JSON.parse(cached) as AnalysisReport;
      }

      return null;
    } catch (error) {
      logger.error({ error }, 'Cache get error');
      return null;
    }
  }

  async set(
    date: string,
    newsHash: string,
    report: AnalysisReport,
  ): Promise<void> {
    try {
      const key = this.generateCacheKey(date, newsHash);
      await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(report));
      logger.info({ key }, 'Report cached');
    } catch (error) {
      logger.error({ error }, 'Cache set error');
    }
  }

  async invalidateForEvent(_eventId: string): Promise<void> {
    try {
      const pattern = `analysis:*:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info({ count: keys.length }, 'Cache invalidated');
      }
    } catch (error) {
      logger.error({ error }, 'Cache invalidation error');
    }
  }

  async clearAll(): Promise<void> {
    try {
      const pattern = `analysis:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info({ count: keys.length }, 'All cache cleared');
      }
    } catch (error) {
      logger.error({ error }, 'Cache clear error');
    }
  }
}

export const resultCache = new ResultCache();
