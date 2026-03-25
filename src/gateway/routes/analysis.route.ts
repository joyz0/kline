import type { Express, Request, Response } from 'express';
import { analysisQueue } from '../../infrastructure/queue/analysis-queue.js';
import { logger } from '../../logging/index.js';
import { z } from 'zod';

const submitAnalysisSchema = z.object({
  selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

export async function registerAnalysisRoutes(app: Express) {
  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const body = submitAnalysisSchema.parse(req.body);

      const taskId = await analysisQueue.addAnalysisJob(body.selectedDate);

      logger.info({ taskId, date: body.selectedDate }, 'Analysis task created');

      return res.status(201).json({
        taskId,
        status: 'PENDING',
        message: 'Analysis task created successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.errors.map((e) => e.message).join(', '),
        });
      }

      logger.error({ error }, 'Failed to create analysis task');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create analysis task',
      });
    }
  });

  app.get('/api/tasks/:taskId', async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params as { taskId: string };

      const task = await analysisQueue.getJobStatus(taskId);

      if (!task) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Task not found',
        });
      }

      return res.json(task);
    } catch (error) {
      logger.error({ error }, 'Failed to get task status');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get task status',
      });
    }
  });

  app.delete('/api/tasks/:taskId', async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params as { taskId: string };

      const cancelled = await analysisQueue.cancelJob(taskId);

      if (!cancelled) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Task not found or already completed',
        });
      }

      return res.json({
        message: 'Task cancelled successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to cancel task');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to cancel task',
      });
    }
  });
}
