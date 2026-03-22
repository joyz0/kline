import { buildServer } from "./gateway/server.js";
import { analysisQueue } from "./infrastructure/queue/analysis-queue.js";
import { taskOrchestrator } from "./gateway/task-orchestrator.js";
import { logger } from "./utils/logger.js";
import { config } from "./config/index.js";

async function bootstrap() {
  logger.info("Starting Kline server...");

  // 构建服务器
  const server = await buildServer();

  // 注册队列处理器
  const queue = analysisQueue.getQueue();

  queue.process(async (job: any) => {
    const { taskId, selectedDate } = job.data;

    // 更新进度
    await job.progress(10);

    // 处理分析任务
    await taskOrchestrator.processAnalysisTask(taskId, selectedDate);
  });

  // 启动服务器
  try {
    await server.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(
      `Server is running on http://${config.server.host}:${config.server.port}`,
    );

    // 处理优雅关闭
    const signals = ["SIGINT", "SIGTERM"];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await server.close();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

// 启动应用
bootstrap().catch((error) => {
  logger.error({ error }, "Bootstrap failed");
  process.exit(1);
});
