import type { AnalysisState } from '../state.js';
import { stockRecommender } from '../../../execution/stock-recommender.js';
import { logger } from '../../../logging/index.js';

export async function screenStocksNode(
  state: AnalysisState,
): Promise<Partial<AnalysisState>> {
  logger.info(
    { taskId: state.taskId, chainCount: state.causalChains.length },
    'Screening stocks',
  );

  try {
    if (state.causalChains.length === 0) {
      logger.warn(
        { taskId: state.taskId },
        'No causal chains to screen stocks from',
      );
      return { stockCandidates: [] };
    }

    const stockCandidates = await stockRecommender.recommendStocks(
      state.causalChains,
    );

    return {
      stockCandidates,
      errors:
        stockCandidates.length === 0
          ? [
              ...state.errors,
              { step: 'stock_screening', message: 'No stocks recommended' },
            ]
          : state.errors,
    };
  } catch (error) {
    logger.error({ error, taskId: state.taskId }, 'Stock screening failed');

    return {
      errors: [
        ...state.errors,
        {
          step: 'stock_screening',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}
