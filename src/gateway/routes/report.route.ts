import { FastifyInstance } from "fastify";
import { logger } from "../../utils/logger.js";

// MVP: 简单缓存报告
const reportCache = new Map<string, any>();

export async function registerReportRoutes(server: FastifyInstance) {
  // 获取分析报告
  server.get("/api/reports/:reportId", async (request, reply) => {
    try {
      const { reportId } = request.params as { reportId: string };

      const report = reportCache.get(reportId);

      if (!report) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Report not found",
        });
      }

      return reply.send(report);
    } catch (error) {
      logger.error({ error }, "Failed to get report");
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to get report",
      });
    }
  });

  // 获取指定日期的报告
  server.get("/api/reports", async (request, reply) => {
    try {
      const { date } = request.query as { date?: string };

      if (!date) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Date parameter is required",
        });
      }

      // TODO: 从数据库查询
      const reports = Array.from(reportCache.values()).filter(
        (r) => r.selectedDate === date,
      );

      return reply.send(reports);
    } catch (error) {
      logger.error({ error }, "Failed to list reports");
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to list reports",
      });
    }
  });
}

// 用于从 worker 保存报告
export function cacheReport(report: any): void {
  reportCache.set(report.id, report);
}
