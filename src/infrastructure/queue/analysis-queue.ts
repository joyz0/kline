import Queue from "bull";
import { v4 as uuidv4 } from "uuid";
import { getRedisClient } from "./redis-client.js";
import { logger } from "../../utils/logger.js";
import type { Task, TaskProgress, AnalysisReport } from "../../types/index.js";
import type { Job } from "bull";

export interface AnalysisJobData {
  taskId: string;
  selectedDate: string;
  progress?: TaskProgress;
  reportId?: string;
}

export interface AnalysisJobResult {
  report: AnalysisReport;
}

class AnalysisQueueManager {
  private queue: Queue.Queue<AnalysisJobData>;

  constructor() {
    const redis = getRedisClient();
    this.queue = new Queue<AnalysisJobData>("analysis", {
      redis: {
        port: redis.options.port,
        host: redis.options.host,
        password: redis.options.password,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    });

    this.setupQueueHandlers();
  }

  private setupQueueHandlers() {
    this.queue.on("error", (err: Error) => {
      logger.error(err, "Queue error");
    });

    this.queue.on("failed", (job: Job<AnalysisJobData>, err: Error) => {
      logger.error({ jobId: job?.id, error: err.message }, "Job failed");
    });

    this.queue.on("completed", (job: Job<AnalysisJobData>) => {
      logger.info({ jobId: job?.id }, "Job completed");
    });
  }

  async addAnalysisJob(selectedDate: string): Promise<string> {
    const taskId = uuidv4();

    await this.queue.add(
      {
        taskId,
        selectedDate,
      },
      {
        jobId: taskId,
        timeout: 300000, // 5 minutes
      },
    );

    logger.info({ taskId, selectedDate }, "Analysis job added");
    return taskId;
  }

  async updateProgress(taskId: string, progress: TaskProgress): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (job) {
      await job.progress(progress.progress);
    }
  }

  async getJobStatus(taskId: string): Promise<Task | null> {
    const job = await this.queue.getJob(taskId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const status = this.mapJobStateToTaskStatus(state);

    return {
      id: String(job.id!),
      selectedDate: job.data.selectedDate,
      status,
      progress: job.data.progress,
      reportId: job.data.reportId,
      error: job.failedReason,
      createdAt: job.timestamp,
      completedAt: job.finishedOn,
    };
  }

  private mapJobStateToTaskStatus(
    state: string,
  ): "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" {
    switch (state) {
      case "waiting":
      case "delayed":
        return "PENDING";
      case "active":
        return "PROCESSING";
      case "completed":
        return "COMPLETED";
      case "failed":
        return "FAILED";
      default:
        return "PENDING";
    }
  }

  async cancelJob(taskId: string): Promise<boolean> {
    const job = await this.queue.getJob(taskId);
    if (job) {
      await job.remove();
      logger.info({ taskId }, "Job cancelled");
      return true;
    }
    return false;
  }

  getQueue() {
    return this.queue;
  }
}

export const analysisQueue = new AnalysisQueueManager();
