import { z } from 'zod';
import { akshareService } from '../../integrations/akshare/index.js';
import { logger } from '../../logging/index.js';
import type { AnyLangGraphTool } from './langgraph-tools.js';

const HistoricalArgsSchema = z.object({
  ticker: z.string().min(1).max(10),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fields: z.array(z.string()).optional(),
}).superRefine((value, ctx) => {
  if (!(value.fromDate || value.from_date)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'fromDate or from_date is required' });
  }

  if (!(value.toDate || value.to_date)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'toDate or to_date is required' });
  }
});

/**
 * 创建 Akshare 股票查询工具
 */
export function createAkshareQuoteTool(): AnyLangGraphTool {
  return {
    name: "get_stock_quote",
    description:
      "查询 A 股股票的实时行情数据。适用于查询沪深 A 股（代码以 60/00/30 开头）的当前价格、涨跌幅、成交量等信息。",
    parameters: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description:
            "A 股股票代码，例如：600519（贵州茅台）、000001（平安银行）、300750（宁德时代）",
          minLength: 1,
          maxLength: 10,
        },
        fields: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "可选，指定返回的字段列表。支持的字段包括：current_price, change, change_percent, volume, amount, market_cap, pe_ratio, pb_ratio 等",
        },
      },
      required: ["ticker"],
    },
    execute: async (args: { ticker: string; fields?: string[] }) => {
      logger.info({ ticker: args.ticker }, "Executing get_stock_quote tool");

      try {
        const quote = await akshareService.getQuote({
          ticker: args.ticker,
          fields: args.fields,
        });

        logger.info(
          { ticker: args.ticker, success: true },
          "get_stock_quote tool completed",
        );

        return quote;
      } catch (error) {
        logger.error(
          { ticker: args.ticker, error },
          "get_stock_quote tool failed",
        );
        throw error;
      }
    },
  };
}

/**
 * 创建 Akshare 批量股票查询工具
 */
export function createAkshareQuotesTool(): AnyLangGraphTool {
  return {
    name: "get_stock_quotes",
    description:
      "批量查询多只 A 股股票的实时行情数据。适用于同时查询多只沪深 A 股股票。",
    parameters: {
      type: "object",
      properties: {
        tickers: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 10,
          },
          description: 'A 股股票代码列表，例如：["600519", "000001", "300750"]',
          minItems: 1,
        },
        fields: {
          type: "array",
          items: {
            type: "string",
          },
          description: "可选，指定返回的字段列表",
        },
      },
      required: ["tickers"],
    },
    execute: async (args: { tickers: string[]; fields?: string[] }) => {
      logger.info(
        { tickers: args.tickers, count: args.tickers.length },
        "Executing get_stock_quotes tool",
      );

      try {
        const quotes = await akshareService.getQuotes({
          tickers: args.tickers,
          fields: args.fields,
        });

        logger.info(
          { successCount: quotes.length },
          "get_stock_quotes tool completed",
        );

        return quotes;
      } catch (error) {
        logger.error({ error }, "get_stock_quotes tool failed");
        throw error;
      }
    },
  };
}

/**
 * 创建 Akshare 股票搜索工具
 */
export function createAkshareSearchTool(): AnyLangGraphTool {
  return {
    name: "search_stocks",
    description: "根据公司名称或股票代码搜索 A 股股票。支持中文公司名称搜索。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            '搜索关键词，可以是公司名称（如"茅台"）或股票代码（如"600519"）',
          minLength: 1,
        },
      },
      required: ["query"],
    },
    execute: async (args: { query: string }) => {
      logger.info({ query: args.query }, "Executing search_stocks tool");

      try {
        const results = await akshareService.search({
          query: args.query,
        });

        logger.info(
          { query: args.query, count: results.length },
          "search_stocks tool completed",
        );

        return results;
      } catch (error) {
        logger.error({ error }, "search_stocks tool failed");
        throw error;
      }
    },
  };
}

/**
 * 创建 Akshare 历史数据查询工具
 */
export function createAkshareHistoricalDataTool(): AnyLangGraphTool {
  return {
    name: "get_historical_data",
    description:
      "查询 A 股股票的历史行情数据，包括开盘价、最高价、最低价、收盘价、成交量等。",
    parameters: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description: "A 股股票代码",
          minLength: 1,
          maxLength: 10,
        },
        fromDate: {
          type: 'string',
          description: '开始日期，格式：YYYY-MM-DD，例如：2024-01-01',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        toDate: {
          type: 'string',
          description: '结束日期，格式：YYYY-MM-DD，例如：2024-12-31',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        fields: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "可选，指定返回的字段列表。支持的字段包括：date, open, high, low, close, volume, amount, amplitude, pct_change, change_amount, turnover_rate",
        },
      },
      required: ['ticker', 'fromDate', 'toDate'],
    },
    execute: async (args: {
      ticker: string;
      fromDate?: string;
      toDate?: string;
      from_date?: string;
      to_date?: string;
      fields?: string[];
    }) => {
      const parsedArgs = HistoricalArgsSchema.parse(args);
      const fromDate = parsedArgs.fromDate ?? parsedArgs.from_date!;
      const toDate = parsedArgs.toDate ?? parsedArgs.to_date!;

      logger.info(
        {
          ticker: parsedArgs.ticker,
          fromDate,
          toDate,
        },
        'Executing get_historical_data tool',
      );

      try {
        const data = await akshareService.getHistoricalData({
          ticker: parsedArgs.ticker,
          fromDate,
          toDate,
          fields: parsedArgs.fields,
        });

        logger.info(
          { ticker: parsedArgs.ticker, dataPoints: data.length },
          'get_historical_data tool completed',
        );

        return data;
      } catch (error) {
        logger.error({ error }, "get_historical_data tool failed");
        throw error;
      }
    },
  };
}

/**
 * 初始化所有 Akshare 工具
 */
export function initializeAkshareTools(): void {
  logger.info({ module: "akshare-tools" }, "Akshare tools initialized");
}

/**
 * 关闭 Akshare MCP 连接
 * 应在 Agent 关闭时调用，防止内存泄露
 */
export async function shutdownAkshareTools(): Promise<void> {
  await akshareService.close();
  logger.info({ module: 'akshare-tools' }, 'Akshare MCP connection closed');
}
