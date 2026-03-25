import type { AnalysisState } from '../state.js';
import { reportGenerator } from '../../../execution/report-generator.js';
import { logger } from '../../../logging/index.js';

export async function generateReportNode(
  state: AnalysisState,
): Promise<Partial<AnalysisState>> {
  logger.info({ taskId: state.taskId }, 'Generating report');

  try {
    const processingTime = Date.now() - state.processingStartTime;

    const finalReport = await reportGenerator.generateReport({
      selectedDate: state.selectedDate,
      causalChains: state.causalChains,
      stockRecommendations: state.stockCandidates,
      newsCount: state.rawNews.length,
      eventsExtracted: state.extractedEvents.length,
      processingTime,
      modelUsed: state.modelUsed,
    });

    return {
      finalReport,
    };
  } catch (error) {
    logger.error({ error, taskId: state.taskId }, 'Report generation failed');

    return {
      errors: [
        ...state.errors,
        {
          step: 'report_generation',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}
