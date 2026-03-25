import type { Express, Request, Response } from 'express';
import { logger } from '../../logging/index.js';

// MVP: 简单缓存报告
const reportCache = new Map<string, any>();

export async function registerReportRoutes(app: Express) {
  app.get('/api/reports/:reportId', async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params as { reportId: string };

      const report = reportCache.get(reportId);

      if (!report) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Report not found',
        });
      }

      return res.json(report);
    } catch (error) {
      logger.error({ error }, 'Failed to get report');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get report',
      });
    }
  });

  app.get('/api/reports', async (req: Request, res: Response) => {
    try {
      const { date } = req.query as { date?: string };

      if (!date) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Date parameter is required',
        });
      }

      // TODO: 从数据库查询
      const reports = Array.from(reportCache.values()).filter(
        (r) => r.selectedDate === date,
      );

      return res.json(reports);
    } catch (error) {
      logger.error({ error }, 'Failed to list reports');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list reports',
      });
    }
  });
}

// 用于从 worker 保存报告
export function cacheReport(report: any): void {
  reportCache.set(report.id, report);
}
