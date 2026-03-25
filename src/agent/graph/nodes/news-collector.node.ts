import type { AnalysisState } from '../state.js';
import { newsCollector } from '../../../infrastructure/outbound/news-api-adapter.js';
import { logger } from '../../../logging/index.js';

export async function collectNewsNode(
  state: AnalysisState,
): Promise<Partial<AnalysisState>> {
  logger.info(
    { taskId: state.taskId, date: state.selectedDate },
    'Collecting news',
  );

  try {
    const rawNews = await newsCollector.collectNews(state.selectedDate);

    return {
      rawNews,
      errors:
        rawNews.length === 0
          ? [{ step: 'news_collection', message: 'No news collected' }]
          : state.errors,
    };
  } catch (error) {
    logger.error({ error, taskId: state.taskId }, 'News collection failed');

    return {
      errors: [
        ...state.errors,
        {
          step: 'news_collection',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}
