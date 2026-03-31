import { z } from 'zod';

export const AkshareQuoteSchema = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  exchange: z.string().optional(),
  currency: z.string().optional(),
  current_price: z.number().optional(),
  change: z.number().optional(),
  change_percent: z.number().optional(),
  volume: z.number().optional(),
  amount: z.number().optional(),
  market_cap: z.number().optional(),
  pe_ratio: z.number().optional(),
  pb_ratio: z.number().optional(),
  high_52week: z.number().optional(),
  low_52week: z.number().optional(),
  open_price: z.number().optional(),
  high_price: z.number().optional(),
  low_price: z.number().optional(),
  pre_close: z.number().optional(),
  bid_price: z.number().optional(),
  ask_price: z.number().optional(),
  bid_volume: z.number().optional(),
  ask_volume: z.number().optional(),
  avg_daily_volume: z.number().optional(),
  turnover_rate: z.number().optional(),
  total_shares: z.number().optional(),
  float_shares: z.number().optional(),
  eps: z.number().optional(),
  bvps: z.number().optional(),
  dividend_yield: z.number().optional(),
  dividend: z.number().optional(),
}).passthrough();

export const AkshareSearchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string(),
}).passthrough();

export const AkshareHistoricalDataSchema = z.object({
  date: z.string(),
  open: z.number().optional(),
  high: z.number().optional(),
  low: z.number().optional(),
  close: z.number().optional(),
  volume: z.number().optional(),
  amount: z.number().optional(),
  amplitude: z.number().optional(),
  pct_change: z.number().optional(),
  change_amount: z.number().optional(),
  turnover_rate: z.number().optional(),
}).passthrough();

export const AkshareQuoteInputSchema = z.object({
  ticker: z.string().min(1).max(10),
  fields: z.array(z.string()).optional(),
});

export const AkshareQuotesInputSchema = z.object({
  tickers: z.array(z.string().min(1).max(10)).min(1),
  fields: z.array(z.string()).optional(),
});

export const AkshareSearchInputSchema = z.object({
  query: z.string().min(1),
});

export const AkshareHistoricalInputSchema = z.object({
  ticker: z.string().min(1).max(10),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fields: z.array(z.string()).optional(),
});

export const AkshareQuotesEnvelopeSchema = z.object({
  quotes: z.array(AkshareQuoteSchema),
});

export const AkshareSearchResultsEnvelopeSchema = z.object({
  results: z.array(AkshareSearchResultSchema),
});

export const AkshareHistoricalDataEnvelopeSchema = z.object({
  historicalData: z.array(AkshareHistoricalDataSchema).optional(),
  closingPrices: z.array(AkshareHistoricalDataSchema).optional(),
});

export type AkshareQuote = z.infer<typeof AkshareQuoteSchema>;
export type AkshareSearchResult = z.infer<typeof AkshareSearchResultSchema>;
export type AkshareHistoricalData = z.infer<typeof AkshareHistoricalDataSchema>;
export type AkshareQuoteInput = z.infer<typeof AkshareQuoteInputSchema>;
export type AkshareQuotesInput = z.infer<typeof AkshareQuotesInputSchema>;
export type AkshareSearchInput = z.infer<typeof AkshareSearchInputSchema>;
export type AkshareHistoricalInput = z.infer<typeof AkshareHistoricalInputSchema>;
