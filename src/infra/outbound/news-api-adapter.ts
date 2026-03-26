import type { NewsItem } from '../../types/index.js';
import { logger } from '../../logging/index.js';
import { browserNewsCollector } from '../../browser/news-collector.js';

export interface NewsSource {
  name: string;
  baseUrl: string;
  fetch: (date: string) => Promise<NewsItem[]>;
  useBrowser?: boolean;
}

export class SinaFinanceAdapter {
  async fetchNews(date: string): Promise<NewsItem[]> {
    try {
      logger.info({ date }, 'Fetching news from Sina Finance');

      if (process.env.USE_BROWSER_FOR_NEWS === 'true') {
        logger.info({ date }, 'Using browser to fetch Sina news');

        const browser = await import('../../browser/news-collector.js');

        const news = await browser.browserNewsCollector.collectNews(date);

        return news.filter((n) => n.source === 'sina');
      }

      return this.getMockNews(date, 'sina');
    } catch (error) {
      logger.error({ error, date }, 'Failed to fetch news from Sina');
      return [];
    }
  }

  private getMockNews(date: string, source: string): NewsItem[] {
    // 模拟数据用于 MVP 开发
    const mockNews: NewsItem[] = [
      {
        id: `${source}-1`,
        title: '地缘政治紧张局势升级，原油价格大幅上涨',
        content:
          '中东地区局势紧张，国际原油价格今日大幅上涨超过 3%，分析师预计可能影响航运成本和能源行业...',
        source,
        url: 'https://example.com/news/1',
        publishedAt: new Date(date).getTime(),
      },
      {
        id: `${source}-2`,
        title: '央行宣布维持利率不变，符合市场预期',
        content:
          '中国人民银行今日宣布维持贷款市场报价利率（LPR）不变，符合市场预期。分析师认为...',
        source,
        url: 'https://example.com/news/2',
        publishedAt: new Date(date).getTime(),
      },
      {
        id: `${source}-3`,
        title: '新能源汽车行业迎来政策利好，补贴延续',
        content:
          '工信部发布新政策，宣布延续新能源汽车购置补贴政策，行业迎来重大利好...',
        source,
        url: 'https://example.com/news/3',
        publishedAt: new Date(date).getTime(),
      },
    ];

    return mockNews;
  }
}

export class EastMoneyAdapter {
  async fetchNews(date: string): Promise<NewsItem[]> {
    try {
      logger.info({ date }, 'Fetching news from East Money');

      if (process.env.USE_BROWSER_FOR_NEWS === 'true') {
        logger.info({ date }, 'Using browser to fetch East Money news');

        const browser = await import('../../browser/news-collector.js');

        const news = await browser.browserNewsCollector.collectNews(date);

        return news.filter((n) => n.source === 'eastmoney');
      }

      return this.getMockNews(date, 'eastmoney');
    } catch (error) {
      logger.error({ error, date }, 'Failed to fetch news from East Money');
      return [];
    }
  }

  private getMockNews(date: string, source: string): NewsItem[] {
    const mockNews: NewsItem[] = [
      {
        id: `${source}-1`,
        title: '全球芯片短缺持续，汽车行业受影响',
        content:
          '全球半导体供应短缺问题持续，多家汽车制造商宣布减产。分析师认为这可能影响整个产业链...',
        source,
        url: 'https://example.com/news/4',
        publishedAt: new Date(date).getTime(),
      },
      {
        id: `${source}-2`,
        title: '房地产行业政策调整，多个城市放松限购',
        content:
          '近期多个城市宣布放松房地产限购政策，市场反应积极。分析师认为...',
        source,
        url: 'https://example.com/news/5',
        publishedAt: new Date(date).getTime(),
      },
    ];

    return mockNews;
  }
}

export class Jin10Adapter {
  async fetchNews(date: string): Promise<NewsItem[]> {
    try {
      logger.info({ date }, 'Fetching news from Jin10');

      if (process.env.USE_BROWSER_FOR_NEWS === 'true') {
        logger.info({ date }, 'Using browser to fetch Jin10 news');

        const browser = await import('../../browser/news-collector.js');

        const news = await browser.browserNewsCollector.collectNews(date);

        return news.filter((n) => n.source === 'jin10');
      }

      return this.getMockNews(date, 'jin10');
    } catch (error) {
      logger.error({ error, date }, 'Failed to fetch news from Jin10');
      return [];
    }
  }

  private getMockNews(date: string, source: string): NewsItem[] {
    const mockNews: NewsItem[] = [
      {
        id: `${source}-1`,
        title: '美联储会议纪要显示鹰派立场',
        content:
          '美联储最新会议纪要显示，多数官员支持继续加息以抑制通胀。美元走强，黄金价格承压...',
        source,
        url: 'https://example.com/news/6',
        publishedAt: new Date(date).getTime(),
      },
    ];

    return mockNews;
  }
}

// 新闻采集聚合器
export class NewsCollector {
  private adapters = [
    new SinaFinanceAdapter(),
    new EastMoneyAdapter(),
    new Jin10Adapter(),
  ];

  async collectNews(date: string): Promise<NewsItem[]> {
    logger.info({ date }, 'Collecting news from all sources');

    const results = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.fetchNews(date)),
    );

    const allNews: NewsItem[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allNews.push(...result.value);
      } else {
        logger.warn(
          { source: index, error: result.reason },
          'Failed to fetch from source',
        );
      }
    });

    // 去重和排序
    const deduplicated = this.deduplicateNews(allNews);
    deduplicated.sort((a, b) => b.publishedAt - a.publishedAt);

    logger.info({ count: deduplicated.length }, 'News collection completed');
    return deduplicated;
  }

  private deduplicateNews(news: NewsItem[]): NewsItem[] {
    const seen = new Set<string>();

    return news.filter((item) => {
      // 基于标题去重
      const hash = this.simpleHash(item.title);
      if (seen.has(hash)) {
        return false;
      }
      seen.add(hash);
      return true;
    });
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}

export const newsCollector = new NewsCollector();
