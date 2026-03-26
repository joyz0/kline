import {
  buildExpressServer,
  closeExpressServer,
} from './gateway/express-server.js';
import { analysisQueue } from './infra/queue/analysis-queue.js';
import { taskOrchestrator } from './gateway/task-orchestrator.js';
import { logger } from './logging/index.js';

async function bootstrap() {
  logger.info({ subsystem: 'gateway' }, 'Starting Kline server...');

  // 构建 Express 服务器
  const expressServer = await buildExpressServer();

  // 注册队列处理器
  const queue = analysisQueue.getQueue();

  queue.process(async (job: any) => {
    const { taskId, selectedDate } = job.data;

    // 更新进度
    await job.progress(10);

    // 处理分析任务
    await taskOrchestrator.processAnalysisTask(taskId, selectedDate);
  });

  logger.info(
    { host: '0.0.0.0', port: expressServer.port },
    `Server is running on http://0.0.0.0:${expressServer.port}`,
  );

  // 处理优雅关闭
  const signals = ['SIGINT', 'SIGTERM'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(
        { signal },
        `Received ${signal}, shutting down gracefully...`,
      );
      await closeExpressServer(expressServer);
      process.exit(0);
    });
  });
}

// 启动应用
bootstrap().catch((error) => {
  logger.error({ error }, 'Bootstrap failed');
  process.exit(1);
});
