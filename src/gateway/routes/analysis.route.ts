import type { FastifyInstance } from 'fastify';
import { analysisQueue } from '../../infrastructure/queue/analysis-queue.js';
import { logger } from '../../logging/index.js';
import { z } from 'zod';

const submitAnalysisSchema = z.object({
  selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

export async function registerAnalysisRoutes(server: FastifyInstance) {
  // 提交分析任务
  server.post('/api/analyze', async (request, reply) => {
    try {
      const body = submitAnalysisSchema.parse(request.body);

      const taskId = await analysisQueue.addAnalysisJob(body.selectedDate);

      logger.info({ taskId, date: body.selectedDate }, 'Analysis task created');

      return reply.status(201).send({
        taskId,
        status: 'PENDING',
        message: 'Analysis task created successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors.map((e) => e.message).join(', '),
        });
      }

      logger.error({ error }, 'Failed to create analysis task');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create analysis task',
      });
    }
  });

  // 查询任务状态
  server.get('/api/tasks/:taskId', async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };

      const task = await analysisQueue.getJobStatus(taskId);

      if (!task) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Task not found',
        });
      }

      return reply.send(task);
    } catch (error) {
      logger.error({ error }, 'Failed to get task status');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get task status',
      });
    }
  });

  // 取消任务
  server.delete('/api/tasks/:taskId', async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };

      const cancelled = await analysisQueue.cancelJob(taskId);

      if (!cancelled) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Task not found or already completed',
        });
      }

      return reply.send({
        message: 'Task cancelled successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to cancel task');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to cancel task',
      });
    }
  });
}
