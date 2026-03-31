import NodeCache from 'node-cache';
import { logger } from '../../logging/index.js';
import {
  AkshareHistoricalInputSchema,
  AkshareQuoteInputSchema,
  AkshareQuotesInputSchema,
  AkshareSearchInputSchema,
  type AkshareHistoricalData,
  type AkshareHistoricalInput,
  type AkshareQuote,
  type AkshareQuoteInput,
  type AkshareQuotesInput,
  type AkshareSearchInput,
  type AkshareSearchResult,
} from '../../mcp/akshare/zod.schema.js';
import {
  AkshareMcpExecutionError,
  AkshareMcpProtocolError,
  AkshareMcpTransportError,
} from '../../mcp/akshare/errors.js';
import { akshareClient, type AkshareClient } from '../../mcp/akshare/akshare-client.js';
import {
  AkshareExecutionError,
  AkshareProtocolError,
  AkshareTransportError,
  AkshareValidationError,
} from './errors.js';

export interface AkshareService {
  getQuote(input: AkshareQuoteInput): Promise<AkshareQuote>;
  getQuotes(input: AkshareQuotesInput): Promise<AkshareQuote[]>;
  search(input: AkshareSearchInput): Promise<AkshareSearchResult[]>;
  getHistoricalData(input: AkshareHistoricalInput): Promise<AkshareHistoricalData[]>;
  close(): Promise<void>;
}

export class AkshareServiceImpl implements AkshareService {
  private readonly cache = new NodeCache({ stdTTL: 60, checkperiod: 60 });

  constructor(private readonly client: AkshareClient) {}

  async getQuote(input: AkshareQuoteInput): Promise<AkshareQuote> {
    const parsed = AkshareQuoteInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AkshareValidationError(parsed.error.message);
    }

    const { ticker, fields } = parsed.data;
    const cacheKey = `quote:${ticker}:${fields?.join(',') ?? 'all'}`;
    const cached = this.cache.get<AkshareQuote>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const quote = await this.client.getQuote(ticker, fields);
      this.cache.set(cacheKey, quote, 30);
      return quote;
    } catch (error) {
      throw this.mapError(error, 'getQuote', { ticker });
    }
  }

  async getQuotes(input: AkshareQuotesInput): Promise<AkshareQuote[]> {
    const parsed = AkshareQuotesInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AkshareValidationError(parsed.error.message);
    }

    const { tickers, fields } = parsed.data;
    const cacheKey = `quotes:${[...tickers].sort().join(',')}:${fields?.join(',') ?? 'all'}`;
    const cached = this.cache.get<AkshareQuote[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const quotes = await this.client.getQuotes(tickers, fields);
      this.cache.set(cacheKey, quotes, 30);
      return quotes;
    } catch (error) {
      throw this.mapError(error, 'getQuotes', { tickers });
    }
  }

  async search(input: AkshareSearchInput): Promise<AkshareSearchResult[]> {
    const parsed = AkshareSearchInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AkshareValidationError(parsed.error.message);
    }

    const { query } = parsed.data;
    const cacheKey = `search:${query}`;
    const cached = this.cache.get<AkshareSearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const results = await this.client.search(query);
      this.cache.set(cacheKey, results, 600);
      return results;
    } catch (error) {
      throw this.mapError(error, 'search', { query });
    }
  }

  async getHistoricalData(
    input: AkshareHistoricalInput,
  ): Promise<AkshareHistoricalData[]> {
    const parsed = AkshareHistoricalInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AkshareValidationError(parsed.error.message);
    }

    const { ticker, fromDate, toDate, fields } = parsed.data;
    const cacheKey = `historical:${ticker}:${fromDate}:${toDate}:${fields?.join(',') ?? 'all'}`;
    const cached = this.cache.get<AkshareHistoricalData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.client.getHistoricalData(
        ticker,
        fromDate,
        toDate,
        fields,
      );
      this.cache.set(cacheKey, data, 1800);
      return data;
    } catch (error) {
      throw this.mapError(error, 'getHistoricalData', {
        ticker,
        fromDate,
        toDate,
      });
    }
  }

  async close(): Promise<void> {
    this.cache.flushAll();
    await this.client.close();
  }

  private mapError(error: unknown, action: string, context: Record<string, unknown>) {
    logger.error({ error, action, ...context }, 'Akshare service action failed');

    if (error instanceof AkshareMcpTransportError) {
      return new AkshareTransportError(error.message);
    }

    if (error instanceof AkshareMcpProtocolError) {
      return new AkshareProtocolError(error.message);
    }

    if (error instanceof AkshareMcpExecutionError) {
      return new AkshareExecutionError(error.message);
    }

    if (error instanceof AkshareValidationError) {
      return error;
    }

    return new AkshareExecutionError(
      error instanceof Error ? error.message : 'Unknown Akshare error',
    );
  }
}

export const akshareService = new AkshareServiceImpl(akshareClient);
