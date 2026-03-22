import type { Event, NewsItem } from "../types/index.js";
import { logger } from "../utils/logger.js";

export class EventExtractor {
  async extractEvents(newsItems: NewsItem[]): Promise<Event[]> {
    logger.info({ count: newsItems.length }, "Extracting events from news");

    const events: Event[] = [];

    for (const news of newsItems) {
      try {
        const extractedEvents = await this.extractFromNews(news);
        events.push(...extractedEvents);
      } catch (error) {
        logger.warn(
          { newsId: news.id, error },
          "Failed to extract events from news",
        );
      }
    }

    logger.info({ count: events.length }, "Event extraction completed");
    return events;
  }

  private async extractFromNews(news: NewsItem): Promise<Event[]> {
    // MVP 版本：基于关键词规则提取事件
    // Phase 2 将使用 LLM + Skills 进行智能提取

    const events: Event[] = [];

    // 地缘政治事件关键词
    const geopoliticalKeywords = [
      "战争",
      "冲突",
      "制裁",
      "外交",
      "军事",
      "地缘",
    ];
    if (
      this.containsKeywords(news.title + news.content, geopoliticalKeywords)
    ) {
      events.push({
        id: `event-${news.id}-geo`,
        type: "GEOPOLITICAL",
        title: news.title,
        description: news.content.substring(0, 200),
        timestamp: news.publishedAt,
        source: news.source,
        confidence: 0.8,
      });
    }

    // 宏观经济事件关键词
    const macroKeywords = [
      "央行",
      "利率",
      "通胀",
      "就业",
      "GDP",
      "经济",
      "美联储",
    ];
    if (this.containsKeywords(news.title + news.content, macroKeywords)) {
      events.push({
        id: `event-${news.id}-macro`,
        type: "MACRO",
        title: news.title,
        description: news.content.substring(0, 200),
        timestamp: news.publishedAt,
        source: news.source,
        confidence: 0.8,
      });
    }

    // 行业事件关键词
    const industryKeywords = ["行业", "产业", "政策", "补贴", "监管", "市场"];
    if (this.containsKeywords(news.title + news.content, industryKeywords)) {
      events.push({
        id: `event-${news.id}-industry`,
        type: "INDUSTRY",
        title: news.title,
        description: news.content.substring(0, 200),
        timestamp: news.publishedAt,
        source: news.source,
        confidence: 0.7,
      });
    }

    // 政策事件关键词
    const policyKeywords = ["政策", "规定", "法规", "政府", "部委", "发布"];
    if (this.containsKeywords(news.title + news.content, policyKeywords)) {
      events.push({
        id: `event-${news.id}-policy`,
        type: "POLICY",
        title: news.title,
        description: news.content.substring(0, 200),
        timestamp: news.publishedAt,
        source: news.source,
        confidence: 0.75,
      });
    }

    return events;
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}

export const eventExtractor = new EventExtractor();
