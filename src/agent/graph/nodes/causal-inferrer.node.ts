import type { AnalysisState } from "../state.js";
import { causalChainInferrer } from "../../../execution/causal-chain-inferrer.js";
import { logger } from "../../../utils/logger.js";

export async function inferCausalChainsNode(
  state: AnalysisState,
): Promise<Partial<AnalysisState>> {
  logger.info(
    { taskId: state.taskId, eventCount: state.extractedEvents.length },
    "Inferring causal chains",
  );

  try {
    if (state.extractedEvents.length === 0) {
      logger.warn({ taskId: state.taskId }, "No events to infer chains from");
      return { causalChains: [] };
    }

    const causalChains = await causalChainInferrer.inferChains(
      state.extractedEvents,
    );

    return {
      causalChains,
      errors:
        causalChains.length === 0
          ? [
              ...state.errors,
              {
                step: "causal_inference",
                message: "No causal chains inferred",
              },
            ]
          : state.errors,
    };
  } catch (error) {
    logger.error({ error, taskId: state.taskId }, "Causal inference failed");

    return {
      errors: [
        ...state.errors,
        {
          step: "causal_inference",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      ],
    };
  }
}
