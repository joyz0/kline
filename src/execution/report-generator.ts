import type {
  AnalysisReport,
  CausalChain,
  StockRecommendation,
  IndustryImpact,
} from "../types/index.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";

export interface ReportGenerationParams {
  selectedDate: string;
  causalChains: CausalChain[];
  stockRecommendations: StockRecommendation[];
  newsCount: number;
  eventsExtracted: number;
  processingTime: number;
  modelUsed: string;
}

export class ReportGenerator {
  async generateReport(
    params: ReportGenerationParams,
  ): Promise<AnalysisReport> {
    logger.info({ date: params.selectedDate }, "Generating analysis report");

    const report: AnalysisReport = {
      id: uuidv4(),
      selectedDate: params.selectedDate,
      createdAt: Date.now(),
      summary: this.generateSummary(params),
      causalChains: params.causalChains,
      industryImpacts: this.extractIndustryImpacts(params.causalChains),
      stockRecommendations: params.stockRecommendations,
      metadata: {
        newsCount: params.newsCount,
        eventsExtracted: params.eventsExtracted,
        processingTime: params.processingTime,
        modelUsed: params.modelUsed,
      },
    };

    logger.info({ reportId: report.id }, "Report generated");
    return report;
  }

  private generateSummary(params: ReportGenerationParams): string {
    const chainCount = params.causalChains.length;
    const stockCount = params.stockRecommendations.length;
    const topIndustries = this.getTopIndustries(params.causalChains);

    return `
【${params.selectedDate} 股市风向分析】

今日共分析 ${params.newsCount} 条新闻，提取 ${params.eventsExtracted} 个关键事件，推导出 ${chainCount} 条因果链。

主要影响行业：${topIndustries.join("、")}

推荐关注 ${stockCount} 只股票，建议重点关注因果链清晰、影响程度高的行业龙头。

详细因果链和个股推荐见下方。
    `.trim();
  }

  private extractIndustryImpacts(chains: CausalChain[]): IndustryImpact[] {
    const industryMap = new Map<string, IndustryImpact>();

    for (const chain of chains) {
      for (const step of chain.steps) {
        const existing = industryMap.get(step.affectedIndustry);

        if (existing) {
          // 更新已有行业影响
          existing.impactScore = Math.max(
            existing.impactScore,
            step.impactMagnitude / 10,
          );
          existing.confidence = (existing.confidence + chain.confidence) / 2;
        } else {
          // 添加新行业
          industryMap.set(step.affectedIndustry, {
            industry: step.affectedIndustry,
            sector: this.mapIndustryToSector(step.affectedIndustry),
            impactScore: step.impactMagnitude / 10,
            delay: step.delay,
            confidence: chain.confidence,
          });
        }
      }
    }

    return Array.from(industryMap.values());
  }

  private mapIndustryToSector(industry: string): string {
    const mapping: Record<string, string> = {
      石油开采: "能源",
      航运: "交通运输",
      新能源: "电力设备",
      光伏: "电力设备",
      燃气轮机: "电力设备",
      房地产: "房地产",
      建筑业: "建筑材料",
      银行业: "金融",
    };

    return mapping[industry] || "其他";
  }

  private getTopIndustries(chains: CausalChain[]): string[] {
    const industryCount = new Map<string, number>();

    for (const chain of chains) {
      for (const industry of chain.affectedIndustries) {
        industryCount.set(industry, (industryCount.get(industry) || 0) + 1);
      }
    }

    return Array.from(industryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([industry]) => industry);
  }
}

export const reportGenerator = new ReportGenerator();
