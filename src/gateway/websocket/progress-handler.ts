import type { FastifyInstance } from 'fastify';
import { logger } from '../../logging/index.js';
import { analysisQueue } from '../../infrastructure/queue/analysis-queue.js';

export async function setupWebSocket(server: FastifyInstance) {
  server.register(async (fastify) => {
    fastify.get(
      '/ws/progress',
      { websocket: true },
      async (connection, req) => {
        const { taskId } = req.query as { taskId?: string };

        if (!taskId) {
          connection.socket.send(
            JSON.stringify({
              error: 'Task ID is required',
            }),
          );
          connection.socket.close();
          return;
        }

        logger.info({ taskId }, 'WebSocket connection established');

        // 定期推送进度
        const interval = setInterval(async () => {
          try {
            const task = await analysisQueue.getJobStatus(taskId);

            if (!task) {
              connection.socket.send(
                JSON.stringify({
                  error: 'Task not found',
                }),
              );
              return;
            }

            connection.socket.send(
              JSON.stringify({
                type: 'progress',
                data: task,
              }),
            );

            // 如果任务完成，关闭连接
            if (task.status === 'COMPLETED' || task.status === 'FAILED') {
              connection.socket.send(
                JSON.stringify({
                  type: 'completed',
                  data: task,
                }),
              );
              clearInterval(interval);
              setTimeout(() => connection.socket.close(), 1000);
            }
          } catch (error) {
            logger.error({ error, taskId }, 'Error sending progress update');
          }
        }, 2000); // 每 2 秒推送一次

        // 清理
        connection.socket.on('close', () => {
          clearInterval(interval);
          logger.info({ taskId }, 'WebSocket connection closed');
        });
      },
    );
  });
}
