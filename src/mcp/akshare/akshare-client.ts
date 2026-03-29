import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../logging/index.js";

export interface AkshareQuote {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  current_price?: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  amount?: number;
  market_cap?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  high_52week?: number;
  low_52week?: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  pre_close?: number;
  bid_price?: number;
  ask_price?: number;
  bid_volume?: number;
  ask_volume?: number;
  avg_daily_volume?: number;
  turnover_rate?: number;
  total_shares?: number;
  float_shares?: number;
  eps?: number;
  bvps?: number;
  dividend_yield?: number;
  dividend?: number;
}

export interface AkshareSearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface AkshareHistoricalData {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  amount?: number;
  amplitude?: number;
  pct_change?: number;
  change_amount?: number;
  turnover_rate?: number;
}

export interface AkshareClientConfig {
  pythonPath?: string;
  aksharePath?: string;
}

export class AkshareClient {
  private readonly config: AkshareClientConfig;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private initialized = false;

  constructor(config: AkshareClientConfig = {}) {
    this.config = {
      pythonPath: "python3",
      aksharePath: "./akshare",
      ...config,
    };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info({}, "Initializing MCP Stdio connection to akshare_mcp");

    const cwd = this.config.aksharePath;

    this.transport = new StdioClientTransport({
      command: "uv",
      args: ["run", "akshare_mcp"],
      cwd,
      env: process.env as Record<string, string>,
    });

    this.client = new Client(
      {
        name: "akshare-typescript-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await this.client.connect(this.transport);
    this.initialized = true;
    logger.info({}, "MCP Stdio connection established");
  }

  async getQuote(ticker: string, fields?: string[]): Promise<AkshareQuote> {
    await this.initialize();

    const args: Record<string, unknown> = { ticker };
    if (fields && fields.length > 0) {
      args.fields = fields;
    }

    logger.info({ ticker, args }, "Calling get_stock_quote via MCP");

    const result = CallToolResultSchema.parse(
      await this.client!.callTool({
        name: "get_stock_quote",
        arguments: args,
      }),
    );

    const content = result.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from MCP");
    }

    const quote = JSON.parse(content.text) as AkshareQuote;
    logger.info({ ticker, success: true }, "Quote fetched via MCP");
    return quote;
  }

  async getQuotes(
    tickers: string[],
    fields?: string[],
  ): Promise<AkshareQuote[]> {
    await this.initialize();

    const args: Record<string, unknown> = { tickers };
    if (fields && fields.length > 0) {
      args.fields = fields;
    }

    logger.info({ tickers, args }, "Calling get_stock_quotes via MCP");

    const result = CallToolResultSchema.parse(
      await this.client!.callTool({
        name: "get_stock_quotes",
        arguments: args,
      }),
    );

    const content = result.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from MCP");
    }

    const quotes = JSON.parse(content.text) as AkshareQuote[];
    logger.info({ tickers, count: quotes.length }, "Quotes fetched via MCP");
    return quotes;
  }

  async search(query: string): Promise<AkshareSearchResult[]> {
    await this.initialize();

    logger.info({ query }, "Calling search_stocks via MCP");

    const result = CallToolResultSchema.parse(
      await this.client!.callTool({
        name: "search_stocks",
        arguments: { query },
      }),
    );

    const content = result.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from MCP");
    }

    const parsed = JSON.parse(content.text) as {
      results: AkshareSearchResult[];
    };
    logger.info(
      { query, count: parsed.results.length },
      "Search completed via MCP",
    );
    return parsed.results;
  }

  async getHistoricalData(
    ticker: string,
    fromDate: string,
    toDate: string,
    fields?: string[],
  ): Promise<AkshareHistoricalData[]> {
    await this.initialize();

    const args: Record<string, unknown> = {
      ticker,
      from_date: fromDate,
      to_date: toDate,
    };
    if (fields && fields.length > 0) {
      args.fields = fields;
    }

    logger.info(
      { ticker, fromDate, toDate },
      "Calling get_historical_data via MCP",
    );

    const result = CallToolResultSchema.parse(
      await this.client!.callTool({
        name: "get_historical_data",
        arguments: args,
      }),
    );

    const content = result.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from MCP");
    }

    const parsed = JSON.parse(content.text) as {
      closingPrices: AkshareHistoricalData[];
    };
    logger.info(
      { ticker, count: parsed.closingPrices.length },
      "Historical data fetched via MCP",
    );
    return parsed.closingPrices;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.initialized = false;
    logger.info({}, "MCP Stdio connection closed");
  }
}

export const akshareClient = new AkshareClient();
