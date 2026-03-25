import type {
  NewsItem,
  Event,
  CausalChain,
  IndustryImpact,
  StockRecommendation,
  AnalysisReport,
} from "../../types/index.js";

export interface AnalysisState {
  // 输入
  selectedDate: string;
  taskId: string;

  // 工具调用
  toolCalls?: Array<{
    toolCallId: string;
    name: string;
    args: Record<string, any>;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;

  // 中间状态
  rawNews: NewsItem[];
  extractedEvents: Event[];
  causalChains: CausalChain[];
  industryImpacts: IndustryImpact[];
  stockCandidates: StockRecommendation[];

  // 输出
  finalReport: AnalysisReport | null;

  // 元数据
  processingStartTime: number;
  modelUsed: string;
  errors: Array<{ step: string; message: string }>;
}

export function createInitialState(
  taskId: string,
  selectedDate: string,
): AnalysisState {
  return {
    selectedDate,
    taskId,
    toolCalls: [],
    toolResults: [],
    rawNews: [],
    extractedEvents: [],
    causalChains: [],
    industryImpacts: [],
    stockCandidates: [],
    finalReport: null,
    processingStartTime: Date.now(),
    modelUsed: "rule-based-mvp",
    errors: [],
  };
}
