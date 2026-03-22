import { StateGraph } from "@langchain/langgraph";
import type { AnalysisState } from "./state.js";
import { collectNewsNode } from "./nodes/news-collector.node.js";
import { extractEventsNode } from "./nodes/event-extractor.node.js";
import { inferCausalChainsNode } from "./nodes/causal-inferrer.node.js";
import { screenStocksNode } from "./nodes/stock-screener.node.js";
import { generateReportNode } from "./nodes/report-generator.node.js";

export function buildAnalysisGraph() {
  const workflow = new StateGraph<AnalysisState>({
    channels: {
      selectedDate: { reducer: (_state, update) => update },
      taskId: { reducer: (_state, update) => update },
      rawNews: { reducer: (_state, update) => update },
      extractedEvents: { reducer: (_state, update) => update },
      causalChains: { reducer: (_state, update) => update },
      industryImpacts: { reducer: (_state, update) => update },
      stockCandidates: { reducer: (_state, update) => update },
      finalReport: { reducer: (_state, update) => update },
      processingStartTime: { reducer: (_state, update) => update },
      modelUsed: { reducer: (_state, update) => update },
      errors: { reducer: (state, update) => [...state, ...update] },
    },
  })
    // 定义节点
    .addNode("news_collector", collectNewsNode)
    .addNode("event_extractor", extractEventsNode)
    .addNode("causal_chain_inferrer", inferCausalChainsNode)
    .addNode("stock_screener", screenStocksNode)
    .addNode("report_generator", generateReportNode)

    // 定义边
    .addEdge("__start__", "news_collector")
    .addEdge("news_collector", "event_extractor")
    .addEdge("event_extractor", "causal_chain_inferrer")
    .addEdge("causal_chain_inferrer", "stock_screener")
    .addEdge("stock_screener", "report_generator")
    .addEdge("report_generator", "__end__");

  return workflow.compile();
}

export const analysisGraph = buildAnalysisGraph();
