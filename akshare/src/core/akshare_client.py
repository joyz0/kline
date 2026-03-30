"""Akshare client for fetching stock data."""

import importlib
import logging
from typing import Any

import pandas as pd

from cache import get_cache_manager, get_rate_limiter
from errors import DataFetchError, NotFoundError

logger = logging.getLogger(__name__)


def _get_akshare():
    """Get akshare module (allows mocking in tests)."""
    return importlib.import_module("akshare")


class AkshareClient:
    """Client for interacting with Akshare API with cache and rate limiting."""

    def __init__(
        self,
        cache_ttl: int = 300,
        rate_limit_calls: int = 10,
        rate_limit_period: int = 60,
    ):
        """
        Initialize the Akshare client.

        Args:
            cache_ttl: Cache time to live in seconds (default: 5 minutes)
            rate_limit_calls: Number of calls allowed per period
            rate_limit_period: Rate limit period in seconds
        """
        self.cache_manager = get_cache_manager()
        self.rate_limiter = get_rate_limiter()

        # Update cache TTL if specified
        if cache_ttl:
            self.cache_manager.ttl = cache_ttl

        self.rate_limiter.calls = rate_limit_calls
        self.rate_limiter.period = rate_limit_period

        logger.info(
            f"AkshareClient initialized with cache_ttl={cache_ttl}s, "
            f"rate_limit={rate_limit_calls} calls per {rate_limit_period}s"
        )

    def get_realtime_quote(self, symbol: str) -> dict[str, Any]:
        """
        Fetch realtime quote data for a given symbol.

        Args:
            symbol: Stock ticker symbol (e.g., 600519, 000001)

        Returns:
            dict: Realtime quote data

        Raises:
            NotFoundError: If the symbol is not found
            DataFetchError: If data fetching fails
        """
        # Check cache first
        cache_key = f"quote:{symbol}"
        cached_data = self.cache_manager.get(cache_key)
        if cached_data is not None:
            logger.info(f"Cache hit for {symbol}")
            return cached_data

        # Apply rate limiting
        logger.debug(f"Acquiring rate limit token for {symbol}")
        self.rate_limiter.wait_and_acquire(resource="quote")

        try:
            logger.info(f"Fetching realtime quote for {symbol}")

            # Fetch all A-share stocks spot data
            df = _get_akshare().stock_zh_a_spot_em()

            # Determine column names
            symbol_col = "代码" if "代码" in df.columns else "symbol"
            if symbol_col not in df.columns:
                raise DataFetchError(f"Unexpected dataframe structure: {df.columns}")

            # Filter by symbol
            quote_data = df[df[symbol_col] == symbol]

            if quote_data.empty:
                raise NotFoundError(f"Stock symbol '{symbol}' not found")

            # Convert to dict and return first row
            result = quote_data.iloc[0].to_dict()

            # Cache the result
            self.cache_manager.set(cache_key, result)

            return result

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error fetching realtime quote for {symbol}: {e}")
            raise DataFetchError(f"Failed to fetch realtime quote: {str(e)}")

    def get_multiple_realtime_quotes(
        self, symbols: list[str]
    ) -> list[dict[str, Any]]:
        """
        Fetch realtime quotes for multiple symbols.

        Args:
            symbols: List of stock ticker symbols

        Returns:
            list: List of quote data dictionaries
        """
        results = []
        for symbol in symbols:
            try:
                quote = self.get_realtime_quote(symbol)
                results.append(quote)
            except Exception as e:
                logger.warning(f"Failed to fetch quote for {symbol}: {e}")
                # Continue with other symbols
        return results

    def search_stocks(self, query: str) -> list[dict[str, Any]]:
        """
        Search for stocks by name or symbol.

        Args:
            query: Search query (company name or symbol)

        Returns:
            list: List of matching stocks with symbol, name, and exchange
        """
        # Check cache first
        cache_key = f"search:{query}"
        cached_data = self.cache_manager.get(cache_key)
        if cached_data is not None:
            logger.info(f"Cache hit for search: {query}")
            return cached_data

        # Apply rate limiting
        self.rate_limiter.wait_and_acquire(resource="search")

        try:
            logger.info(f"Searching stocks with query: {query}")

            # Fetch all A-share stocks
            df = _get_akshare().stock_zh_a_spot_em()

            # Determine column names
            symbol_col = "代码" if "代码" in df.columns else "symbol"
            name_col = "名称" if "名称" in df.columns else "name"
            exchange_col = None

            # Determine exchange column
            if "交易所" in df.columns:
                exchange_col = "交易所"
            elif "market" in df.columns:
                exchange_col = "market"

            # Filter by query (case-insensitive)
            query_upper = query.upper()
            mask = df[symbol_col].astype(str).str.contains(
                query_upper, case=False, na=False
            )

            # Also search by name if name column exists
            if name_col in df.columns:
                name_mask = df[name_col].astype(str).str.contains(
                    query, case=False, na=False
                )
                mask = mask | name_mask

            results_df = df[mask]

            # Build result list
            results = []
            for _, row in results_df.iterrows():
                result = {
                    "symbol": row.get(symbol_col, ""),
                    "name": row.get(name_col, ""),
                }
                if exchange_col and exchange_col in row:
                    result["exchange"] = row[exchange_col]
                else:
                    # Infer exchange from symbol
                    if row.get(symbol_col, "").startswith("6"):
                        result["exchange"] = "SH"
                    elif row.get(symbol_col, "").startswith(("0", "3")):
                        result["exchange"] = "SZ"
                    else:
                        result["exchange"] = "UNKNOWN"

                results.append(result)

            # Limit results to 20
            results = results[:20]

            # Cache the result (30 minutes for search)
            self.cache_manager.set(cache_key, results, ttl=1800)

            return results

        except Exception as e:
            logger.error(f"Error searching stocks: {e}")
            raise DataFetchError(f"Failed to search stocks: {str(e)}")

    def get_historical_data(
        self, symbol: str, start_date: str, end_date: str
    ) -> pd.DataFrame:
        """
        Fetch historical stock data.

        Args:
            symbol: Stock ticker symbol
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format

        Returns:
            pd.DataFrame: Historical data with columns: date, open, high, low, close, volume

        Raises:
            NotFoundError: If the symbol is not found
            DataFetchError: If data fetching fails
        """
        # Check cache first
        cache_key = f"history:{symbol}:{start_date}:{end_date}"
        cached_data = self.cache_manager.get(cache_key)
        if cached_data is not None:
            logger.info(f"Cache hit for historical data: {symbol}")
            # Convert dict back to DataFrame
            return pd.DataFrame(cached_data)

        # Apply rate limiting
        self.rate_limiter.wait_and_acquire(resource="history")

        try:
            logger.info(
                f"Fetching historical data for {symbol} from {start_date} to {end_date}"
            )

            # Convert date format from YYYY-MM-DD to YYYYMMDD
            start_date_formatted = start_date.replace("-", "")
            end_date_formatted = end_date.replace("-", "")

            # Fetch historical data
            df = _get_akshare().stock_zh_a_hist(
                symbol=symbol,
                period="daily",
                start_date=start_date_formatted,
                end_date=end_date_formatted,
                adjust="qfq",  # Adjusted prices
            )

            if df.empty:
                raise NotFoundError(
                    f"No historical data found for {symbol} in the given date range"
                )

            # Standardize column names
            column_mapping = {
                "日期": "date",
                "开盘": "open",
                "最高": "high",
                "最低": "low",
                "收盘": "close",
                "成交量": "volume",
                "成交额": "amount",
                "振幅": "amplitude",
                "涨跌幅": "pct_change",
                "涨跌额": "change_amount",
                "换手率": "turnover_rate",
            }

            df = df.rename(columns=column_mapping)

            # Ensure date column is string in YYYY-MM-DD format
            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

            # Cache the result (1 hour for historical data)
            self.cache_manager.set(cache_key, df.to_dict("records"), ttl=3600)

            return df

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {e}")
            raise DataFetchError(f"Failed to fetch historical data: {str(e)}")

    def get_stock_info(self, symbol: str) -> dict[str, Any]:
        """
        Fetch detailed stock information.

        Args:
            symbol: Stock ticker symbol

        Returns:
            dict: Stock information including company name, industry, etc.
        """
        # Check cache first
        cache_key = f"info:{symbol}"
        cached_data = self.cache_manager.get(cache_key)
        if cached_data is not None:
            logger.info(f"Cache hit for stock info: {symbol}")
            return cached_data

        # Apply rate limiting
        self.rate_limiter.wait_and_acquire(resource="info")

        try:
            logger.info(f"Fetching stock info for {symbol}")

            # Fetch stock information
            df = _get_akshare().stock_individual_info_em(symbol=symbol)

            if df.empty:
                raise NotFoundError(f"Stock info not found for {symbol}")

            # Convert to dict
            info = {}
            for _, row in df.iterrows():
                # The dataframe structure varies, try to extract key-value pairs
                for col in df.columns:
                    value = row[col]
                    if isinstance(value, (str, int, float)) and pd.notna(value):
                        info[col] = value

            # Cache the result (1 hour for stock info)
            self.cache_manager.set(cache_key, info, ttl=3600)

            return info

        except NotFoundError:
            logger.warning(f"Stock info not found for {symbol}")
            return {}
        except Exception as e:
            logger.error(f"Error fetching stock info for {symbol}: {e}")
            # Return empty dict instead of raising
            return {}

    def clear_cache(self) -> None:
        """Clear all cached data."""
        self.cache_manager.clear()
        logger.info("Cache cleared")

    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        return self.cache_manager.get_stats()
