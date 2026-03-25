import { analysisGraph } from './graph/causal-graph.js';
import { createInitialState } from './graph/state.js';
import { logger } from '../logging/index.js';
import type { AnalysisReport } from '../types/index.js';

export interface AnalysisResult {
  success: boolean;
  report?: AnalysisReport;
  errors?: Array<{ step: string; message: string }>;
}

export class AgentRuntime {
  async runAnalysis(
    taskId: string,
    selectedDate: string,
  ): Promise<AnalysisResult> {
    logger.info({ taskId, selectedDate }, 'Starting analysis');

    try {
      const initialState = createInitialState(taskId, selectedDate);

      const result = await analysisGraph.invoke(initialState);

      if (result.finalReport) {
        logger.info(
          { taskId, reportId: result.finalReport.id },
          'Analysis completed successfully',
        );

        return {
          success: true,
          report: result.finalReport,
        };
      } else {
        logger.warn({ taskId }, 'Analysis completed but no report generated');

        return {
          success: false,
          errors: result.errors,
        };
      }
    } catch (error) {
      logger.error({ error, taskId }, 'Analysis failed');

      return {
        success: false,
        errors: [
          {
            step: 'graph_execution',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }
}

export const agentRuntime = new AgentRuntime();
