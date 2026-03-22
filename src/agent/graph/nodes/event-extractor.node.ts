import type { AnalysisState } from "../state.js";
import { eventExtractor } from "../../../execution/event-extractor.js";
import { logger } from "../../../utils/logger.js";

export async function extractEventsNode(
  state: AnalysisState,
): Promise<Partial<AnalysisState>> {
  logger.info(
    { taskId: state.taskId, newsCount: state.rawNews.length },
    "Extracting events",
  );

  try {
    if (state.rawNews.length === 0) {
      logger.warn({ taskId: state.taskId }, "No news to extract events from");
      return { extractedEvents: [] };
    }

    const extractedEvents = await eventExtractor.extractEvents(state.rawNews);

    return {
      extractedEvents,
      errors:
        extractedEvents.length === 0
          ? [
              ...state.errors,
              { step: "event_extraction", message: "No events extracted" },
            ]
          : state.errors,
    };
  } catch (error) {
    logger.error({ error, taskId: state.taskId }, "Event extraction failed");

    return {
      errors: [
        ...state.errors,
        {
          step: "event_extraction",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      ],
    };
  }
}
