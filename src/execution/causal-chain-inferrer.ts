import type { Event, CausalChain } from '../types/index.js';
import { logger } from '../logging/index.js';

export class CausalChainInferrer {
  async inferChains(events: Event[]): Promise<CausalChain[]> {
    logger.info({ count: events.length }, 'Inferring causal chains');

    // MVP 版本：基于预定义规则推导因果链
    // Phase 2 将使用 LLM + Skills + Few-shot learning

    const chains: CausalChain[] = [];

    // 示例：地缘政治 → 原油 → 航运 → 新能源
    const geopoliticalEvents = events.filter((e) => e.type === 'GEOPOLITICAL');

    for (const event of geopoliticalEvents) {
      const chain = this.buildGeopoliticalChain(event);
      if (chain) {
        chains.push(chain);
      }
    }

    // 示例：宏观政策 → 行业影响
    const macroEvents = events.filter((e) => e.type === 'MACRO');

    for (const event of macroEvents) {
      const chain = this.buildMacroChain(event);
      if (chain) {
        chains.push(chain);
      }
    }

    logger.info({ count: chains.length }, 'Causal chain inference completed');
    return chains;
  }

  private buildGeopoliticalChain(event: Event): CausalChain | null {
    // 示例因果链：地缘冲突 → 原油上涨 → 航运成本 → 新能源替代
    return {
      id: `chain-${event.id}`,
      startEvent: event.id,
      steps: [
        {
          id: `step-1-${event.id}`,
          event: event.title,
          impact: '原油价格上涨',
          affectedIndustry: '石油开采',
          impactMagnitude: 8,
          delay: 1,
        },
        {
          id: `step-2-${event.id}`,
          event: '原油价格上涨',
          impact: '航运成本上升',
          affectedIndustry: '航运',
          impactMagnitude: 7,
          delay: 2,
        },
        {
          id: `step-3-${event.id}`,
          event: '航运成本上升',
          impact: '新能源替代需求增加',
          affectedIndustry: '新能源',
          impactMagnitude: 6,
          delay: 7,
        },
      ],
      affectedIndustries: ['石油开采', '航运', '新能源', '光伏', '燃气轮机'],
      confidence: 0.75,
    };
  }

  private buildMacroChain(event: Event): CausalChain | null {
    // 示例因果链：利率政策 → 行业融资成本 → 投资影响
    return {
      id: `chain-${event.id}`,
      startEvent: event.id,
      steps: [
        {
          id: `step-1-${event.id}`,
          event: event.title,
          impact: '融资成本变化',
          affectedIndustry: '房地产',
          impactMagnitude: 6,
          delay: 3,
        },
        {
          id: `step-2-${event.id}`,
          event: '融资成本变化',
          impact: '投资意愿变化',
          affectedIndustry: '建筑业',
          impactMagnitude: 5,
          delay: 7,
        },
      ],
      affectedIndustries: ['房地产', '建筑业', '银行业'],
      confidence: 0.7,
    };
  }
}

export const causalChainInferrer = new CausalChainInferrer();
