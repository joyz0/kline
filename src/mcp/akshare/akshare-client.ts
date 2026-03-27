import { logger } from '../../logging/index.js';
import { spawn } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(require('child_process').execFile);

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

  constructor(config: AkshareClientConfig = {}) {
    this.config = {
      pythonPath: 'python3',
      aksharePath: './akshare',
      ...config,
    };
  }

  private async executeCommand(command: string, args: string[]): Promise<string> {
    try {
      logger.info({ command, args }, 'Executing Akshare command');

      const { stdout, stderr } = await execFile(this.config.pythonPath!, [
        '-m',
        'akshare',
        command,
        ...args,
      ], {
        cwd: this.config.aksharePath,
      });

      if (stderr) {
        logger.warn({ stderr }, 'Akshare command stderr');
      }

      logger.info({ stdout: stdout.substring(0, 100) + '...' }, 'Akshare command executed successfully');
      return stdout;
    } catch (error) {
      logger.error({ error, command, args }, 'Failed to execute Akshare command');
      throw new Error(
        `Failed to execute Akshare command: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getQuote(ticker: string, fields?: string[]): Promise<AkshareQuote> {
    try {
      logger.info({ ticker }, 'Fetching quote from Akshare');

      const args = [ticker];
      if (fields && fields.length > 0) {
        args.push(...fields);
      }

      const stdout = await this.executeCommand('quote', args);
      const quote = JSON.parse(stdout) as AkshareQuote;

      logger.info({ ticker, success: true }, 'Quote fetched successfully');

      return quote;
    } catch (error) {
      logger.error({ ticker, error }, 'Failed to fetch quote');
      throw new Error(
        `Failed to fetch quote for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getQuotes(
    tickers: string[],
    fields?: string[],
  ): Promise<AkshareQuote[]> {
    try {
      logger.info(
        { tickers, count: tickers.length },
        'Fetching multiple quotes from Akshare',
      );

      const results: AkshareQuote[] = [];

      for (const ticker of tickers) {
        try {
          const quote = await this.getQuote(ticker, fields);
          results.push(quote);
        } catch (error) {
          logger.warn(
            { ticker, error },
            `Failed to fetch quote for ${ticker}, continuing with others`,
          );
        }
      }

      logger.info(
        { successCount: results.length, totalCount: tickers.length },
        'Multiple quotes fetched',
      );

      return results;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch multiple quotes');
      throw error;
    }
  }

  async search(query: string): Promise<AkshareSearchResult[]> {
    try {
      logger.info({ query }, 'Searching stocks in Akshare');

      const stdout = await this.executeCommand('search', [query]);
      const parsed = JSON.parse(stdout) as { results: AkshareSearchResult[] };

      logger.info(
        { query, count: parsed.results.length },
        'Search completed',
      );

      return parsed.results;
    } catch (error) {
      logger.error({ query, error }, 'Failed to search stocks');
      throw new Error(
        `Failed to search stocks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getHistoricalData(
    ticker: string,
    fromDate: string,
    toDate: string,
    fields?: string[],
  ): Promise<AkshareHistoricalData[]> {
    try {
      logger.info(
        { ticker, fromDate, toDate },
        'Fetching historical data from Akshare',
      );

      const args = [ticker, fromDate, toDate];
      if (fields && fields.length > 0) {
        args.push(...fields);
      }

      const stdout = await this.executeCommand('history', args);
      const parsed = JSON.parse(stdout) as { closingPrices: AkshareHistoricalData[] };

      logger.info(
        { ticker, count: parsed.closingPrices.length },
        'Historical data fetched',
      );

      return parsed.closingPrices;
    } catch (error) {
      logger.error({ ticker, error }, 'Failed to fetch historical data');
      throw new Error(
        `Failed to fetch historical data for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

export const akshareClient = new AkshareClient();
