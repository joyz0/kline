import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from '../../config/index.js';
import { logger } from '../../logging/index.js';
import {
  AkshareMcpExecutionError,
  AkshareMcpProtocolError,
  AkshareMcpTransportError,
} from './errors.js';
import {
  AkshareHistoricalDataEnvelopeSchema,
  AkshareHistoricalDataSchema,
  AkshareQuoteSchema,
  AkshareQuotesEnvelopeSchema,
  AkshareSearchResultsEnvelopeSchema,
  type AkshareHistoricalData,
  type AkshareQuote,
  type AkshareSearchResult,
} from './zod.schema.js';

export interface AkshareClient {
  getQuote(ticker: string, fields?: string[]): Promise<AkshareQuote>;
  getQuotes(tickers: string[], fields?: string[]): Promise<AkshareQuote[]>;
  search(query: string): Promise<AkshareSearchResult[]>;
  getHistoricalData(
    ticker: string,
    fromDate: string,
    toDate: string,
    fields?: string[],
  ): Promise<AkshareHistoricalData[]>;
  close(): Promise<void>;
}

export interface AkshareClientConfig {
  command?: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
}

export class AkshareMcpClient implements AkshareClient {
  private readonly config: AkshareClientConfig;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: AkshareClientConfig = {}) {
    const akshareConfig = getConfig().getAkshareConfig();

    this.config = {
      command: akshareConfig.command,
      args: [...akshareConfig.args],
      cwd: akshareConfig.cwd,
      timeoutMs: akshareConfig.timeoutMs,
      ...config,
    };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this.connect();

    try {
      await this.initPromise;
      this.initialized = true;
    } catch (error) {
      await this.reset();
      throw error;
    } finally {
      this.initPromise = null;
    }
  }

  private async connect(): Promise<void> {
    logger.info(
      {
        command: this.config.command,
        args: this.config.args,
        cwd: this.config.cwd,
      },
      'Initializing MCP connection to Akshare server',
    );

    this.transport = new StdioClientTransport({
      command: this.config.command!,
      args: this.config.args!,
      cwd: this.config.cwd,
      env: process.env as Record<string, string>,
    });

    this.client = new Client(
      {
        name: 'akshare-typescript-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    );

    try {
      await this.client.connect(this.transport);
      logger.info({}, 'Akshare MCP connection established');
    } catch (error) {
      throw new AkshareMcpTransportError(
        error instanceof Error ? error.message : 'Failed to connect to Akshare MCP server',
      );
    }
  }

  async getQuote(ticker: string, fields?: string[]): Promise<AkshareQuote> {
    const args: Record<string, unknown> = { ticker };
    if (fields && fields.length > 0) {
      args.fields = fields;
    }

    const payload = await this.callStructuredTool<unknown>('get_stock_quote', args);
    return AkshareQuoteSchema.parse(payload);
  }

  async getQuotes(tickers: string[], fields?: string[]): Promise<AkshareQuote[]> {
    const args: Record<string, unknown> = { tickers };
    if (fields && fields.length > 0) {
      args.fields = fields;
    }

    const payload = await this.callStructuredTool<unknown>('get_stock_quotes', args);

    if (Array.isArray(payload)) {
      return payload.map((item) => AkshareQuoteSchema.parse(item));
    }

    const parsed = AkshareQuotesEnvelopeSchema.parse(payload);
    return parsed.quotes;
  }

  async search(query: string): Promise<AkshareSearchResult[]> {
    const payload = await this.callStructuredTool<unknown>('search_stocks', { query });
    const parsed = AkshareSearchResultsEnvelopeSchema.parse(payload);
    return parsed.results;
  }

  async getHistoricalData(
    ticker: string,
    fromDate: string,
    toDate: string,
    fields?: string[],
  ): Promise<AkshareHistoricalData[]> {
    const args: Record<string, unknown> = {
      ticker,
      from_date: fromDate,
      to_date: toDate,
      fromDate,
      toDate,
    };

    if (fields && fields.length > 0) {
      args.fields = fields;
    }

    const payload = await this.callStructuredTool<unknown>('get_historical_data', args);
    const parsed = AkshareHistoricalDataEnvelopeSchema.parse(payload);
    const data = parsed.historicalData ?? parsed.closingPrices ?? [];
    return data.map((item) => AkshareHistoricalDataSchema.parse(item));
  }

  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
      }
    } finally {
      await this.reset();
      logger.info({}, 'Akshare MCP connection closed');
    }
  }

  private async callStructuredTool<T>(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    await this.initialize();

    if (!this.client) {
      throw new AkshareMcpTransportError('Akshare MCP client is not initialized');
    }

    logger.info({ toolName, args }, 'Calling Akshare MCP tool');

    let result: unknown;
    try {
      const call = this.client.callTool({
        name: toolName,
        arguments: args,
      });
      result = await this.withTimeout(call);
    } catch (error) {
      throw new AkshareMcpExecutionError(
        error instanceof Error ? error.message : `Akshare MCP tool failed: ${toolName}`,
      );
    }

    const parsedResult = CallToolResultSchema.parse(result);

    if (parsedResult.structuredContent !== undefined) {
      return parsedResult.structuredContent as T;
    }

    const textContent = parsedResult.content.find((content) => content.type === 'text');
    if (!textContent || typeof textContent.text !== 'string') {
      throw new AkshareMcpProtocolError(
        `Akshare MCP tool ${toolName} returned no structured content or text payload`,
      );
    }

    try {
      return JSON.parse(textContent.text) as T;
    } catch (error) {
      throw new AkshareMcpProtocolError(
        error instanceof Error ? error.message : 'Failed to parse Akshare MCP text payload',
      );
    }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    const timeoutMs = this.config.timeoutMs;
    if (!timeoutMs || timeoutMs <= 0) {
      return promise;
    }

    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new AkshareMcpTransportError(`Akshare MCP request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  }

  private async reset(): Promise<void> {
    this.client = null;
    this.transport = null;
    this.initialized = false;
    this.initPromise = null;
  }
}

export const akshareClient = new AkshareMcpClient();
