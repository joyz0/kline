import type { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import { logger } from '../../logging/index.js';
import { analysisQueue } from '../../infra/queue/analysis-queue.js';

export async function setupWebSocket(wsServer: WebSocketServer) {
  wsServer.on('connection', (socket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const taskId = url.searchParams.get('taskId');

    if (!taskId) {
      socket.send(
        JSON.stringify({
          error: 'Task ID is required',
        }),
      );
      socket.close();
      return;
    }

    logger.info({ taskId }, 'WebSocket connection established');

    // 定期推送进度
    const interval = setInterval(async () => {
      try {
        const task = await analysisQueue.getJobStatus(taskId);

        if (!task) {
          socket.send(
            JSON.stringify({
              error: 'Task not found',
            }),
          );
          return;
        }

        socket.send(
          JSON.stringify({
            type: 'progress',
            data: task,
          }),
        );

        // 如果任务完成，关闭连接
        if (task.status === 'COMPLETED' || task.status === 'FAILED') {
          socket.send(
            JSON.stringify({
              type: 'completed',
              data: task,
            }),
          );
          clearInterval(interval);
          setTimeout(() => socket.close(), 1000);
        }
      } catch (error) {
        logger.error({ error, taskId }, 'Error sending progress update');
      }
    }, 2000); // 每 2 秒推送一次

    // 清理
    socket.on('close', () => {
      clearInterval(interval);
      logger.info({ taskId }, 'WebSocket connection closed');
    });
  });
}
