import { z } from "zod";

// ========== 事件类型定义 ==========

export const EventTypeSchema = z.enum([
  "GEOPOLITICAL",
  "MACRO",
  "INDUSTRY",
  "POLICY",
]);

export type EventType = z.infer<typeof EventTypeSchema>;

export const EventSchema = z.object({
  id: z.string(),
  type: EventTypeSchema,
  title: z.string(),
  description: z.string(),
  timestamp: z.number(),
  source: z.string(),
  participants: z.array(z.string()).optional(),
  region: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type Event = z.infer<typeof EventSchema>;

// ========== 新闻类型定义 ==========

export const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  source: z.string(),
  url: z.string(),
  publishedAt: z.number(),
  author: z.string().optional(),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;

// ========== 因果链类型定义 ==========

export const CausalStepSchema = z.object({
  id: z.string(),
  event: z.string(),
  impact: z.string(),
  affectedIndustry: z.string(),
  impactMagnitude: z.number().min(0).max(10),
  delay: z.number().int().nonnegative(), // 影响延迟（天数）
});

export type CausalStep = z.infer<typeof CausalStepSchema>;

export const CausalChainSchema = z.object({
  id: z.string(),
  startEvent: z.string(),
  steps: z.array(CausalStepSchema),
  affectedIndustries: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  learnedFrom: z.array(z.string()).optional(),
});

export type CausalChain = z.infer<typeof CausalChainSchema>;

// ========== 行业影响类型定义 ==========

export const IndustryImpactSchema = z.object({
  industry: z.string(),
  sector: z.string(),
  impactScore: z.number().min(-1).max(1),
  delay: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export type IndustryImpact = z.infer<typeof IndustryImpactSchema>;

// ========== 股票推荐类型定义 ==========

export const StockRecommendationSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  industry: z.string(),
  recommendationType: z.enum(["BUY", "SELL", "HOLD"]),
  targetPrice: z.number().optional(),
  stopLoss: z.number().optional(),
  reasoning: z.string(),
  basedOnChain: z.string(),
  confidence: z.number().min(0).max(1),
});

export type StockRecommendation = z.infer<typeof StockRecommendationSchema>;

// ========== 分析报告类型定义 ==========

export const AnalysisReportSchema = z.object({
  id: z.string(),
  selectedDate: z.string(),
  createdAt: z.number(),
  summary: z.string(),
  causalChains: z.array(CausalChainSchema),
  industryImpacts: z.array(IndustryImpactSchema),
  stockRecommendations: z.array(StockRecommendationSchema),
  metadata: z.object({
    newsCount: z.number(),
    eventsExtracted: z.number(),
    processingTime: z.number(),
    modelUsed: z.string(),
  }),
});

export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;

// ========== 任务状态类型定义 ==========

export const TaskStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskProgressSchema = z.object({
  currentStep: z.string(),
  progress: z.number().min(0).max(100),
  message: z.string(),
});

export type TaskProgress = z.infer<typeof TaskProgressSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  selectedDate: z.string(),
  status: TaskStatusSchema,
  progress: TaskProgressSchema.optional(),
  reportId: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.number(),
  completedAt: z.number().optional(),
});

export type Task = z.infer<typeof TaskSchema>;
