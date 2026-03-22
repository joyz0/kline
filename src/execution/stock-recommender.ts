import type { CausalChain, StockRecommendation } from "../types/index.js";
import { logger } from "../utils/logger.js";

export interface StockCandidate {
  symbol: string;
  name: string;
  industry: string;
  score: number;
}

export class StockRecommender {
  async recommendStocks(
    causalChains: CausalChain[],
  ): Promise<StockRecommendation[]> {
    logger.info({ count: causalChains.length }, "Recommending stocks");

    // MVP 版本：基于规则推荐股票
    // Phase 2 将使用 LLM + 知识图谱

    const recommendations: StockRecommendation[] = [];

    for (const chain of causalChains) {
      const stocks = this.findStockCandidates(chain);
      recommendations.push(...stocks);
    }

    // 去重和排序
    const unique = this.deduplicateRecommendations(recommendations);
    unique.sort((a, b) => b.confidence - a.confidence);

    logger.info({ count: unique.length }, "Stock recommendation completed");
    return unique.slice(0, 10); // 返回前 10 个推荐
  }

  private findStockCandidates(chain: CausalChain): StockRecommendation[] {
    const recommendations: StockRecommendation[] = [];

    // MVP: 使用硬编码的股票映射
    // Phase 2: 从知识图谱查询
    const stockMap: Record<string, Array<{ symbol: string; name: string }>> = {
      石油开采: [
        { symbol: "601857", name: "中国石油" },
        { symbol: "600028", name: "中国石化" },
      ],
      航运: [
        { symbol: "601919", name: "中远海控" },
        { symbol: "600026", name: "中远海能" },
      ],
      新能源: [
        { symbol: "300750", name: "宁德时代" },
        { symbol: "002594", name: "比亚迪" },
      ],
      光伏: [
        { symbol: "601012", name: "隆基绿能" },
        { symbol: "300274", name: "阳光电源" },
      ],
      房地产: [
        { symbol: "000002", name: "万科 A" },
        { symbol: "600048", name: "保利发展" },
      ],
    };

    for (const industry of chain.affectedIndustries) {
      const stocks = stockMap[industry] || [];

      for (const stock of stocks) {
        const step = chain.steps.find(
          (s: any) => s.affectedIndustry === industry,
        );
        const impactMagnitude = step?.impactMagnitude || 5;

        recommendations.push({
          symbol: stock.symbol,
          name: stock.name,
          industry,
          recommendationType: impactMagnitude > 6 ? "BUY" : "HOLD",
          reasoning: this.generateReasoning(chain, industry),
          basedOnChain: chain.id,
          confidence: chain.confidence * (impactMagnitude / 10),
        });
      }
    }

    return recommendations;
  }

  private generateReasoning(chain: CausalChain, industry: string): string {
    const step = chain.steps.find((s: any) => s.affectedIndustry === industry);

    return `基于因果链推导：${chain.steps.map((s: any) => `${s.event} → ${s.impact}`).join(" → ")}。${industry}行业受影响程度：${step?.impactMagnitude || 5}/10。`;
  }

  private deduplicateRecommendations(
    recommendations: StockRecommendation[],
  ): StockRecommendation[] {
    const seen = new Set<string>();

    return recommendations.filter((item) => {
      if (seen.has(item.symbol)) {
        return false;
      }
      seen.add(item.symbol);
      return true;
    });
  }
}

export const stockRecommender = new StockRecommender();
