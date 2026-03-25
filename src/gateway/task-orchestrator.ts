import { analysisQueue } from '../infrastructure/queue/analysis-queue.js';
import { agentRuntime } from '../agent/agent-runtime.js';
import { cacheReport } from '../gateway/routes/report.route.js';
import { logger } from '../logging/index.js';

export class TaskOrchestrator {
  async processAnalysisTask(
    taskId: string,
    selectedDate: string,
  ): Promise<void> {
    logger.info({ taskId, selectedDate }, 'Processing analysis task');

    try {
      // 更新进度
      await analysisQueue.updateProgress(taskId, {
        currentStep: 'initializing',
        progress: 0,
        message: 'Starting analysis...',
      });

      // 运行 Agent 分析
      const result = await agentRuntime.runAnalysis(taskId, selectedDate);

      if (result.success && result.report) {
        // 缓存报告
        cacheReport(result.report);

        // 更新进度为完成
        await analysisQueue.updateProgress(taskId, {
          currentStep: 'completed',
          progress: 100,
          message: 'Analysis completed',
        });

        logger.info(
          { taskId, reportId: result.report.id },
          'Analysis task completed successfully',
        );
      } else {
        // 更新进度为失败
        await analysisQueue.updateProgress(taskId, {
          currentStep: 'failed',
          progress: 0,
          message: `Analysis failed: ${result.errors?.map((e) => e.message).join(', ')}`,
        });

        logger.warn({ taskId, errors: result.errors }, 'Analysis task failed');
      }
    } catch (error) {
      logger.error({ error, taskId }, 'Unexpected error in task processing');

      await analysisQueue.updateProgress(taskId, {
        currentStep: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const taskOrchestrator = new TaskOrchestrator();
