"""Akshare client for fetching stock data."""

import importlib
import logging
import threading
from typing import Any, Optional

import pandas as pd

from cache import RateLimiter
from errors import DataFetchError, NotFoundError

logger = logging.getLogger(__name__)


def _get_akshare():
    """Get akshare module (allows mocking in tests)."""
    return importlib.import_module("akshare")


class AkshareClient:
    """
    Client for interacting with Akshare API with rate limiting.
    
    All instances share a global rate limiter to ensure API calls
    are properly throttled across the entire application.
    """

    # Class-level shared rate limiter (all instances share the same limiter)
    _global_rate_limiter: Optional[RateLimiter] = None
    _rate_limiter_lock = threading.Lock()

    def __init__(
        self,
        rate_limit_calls: int = 10,
        rate_limit_period: int = 60,
    ):
        """
        Initialize the Akshare client.

        Args:
            rate_limit_calls: Number of calls allowed per period
            rate_limit_period: Rate limit period in seconds
        """
        # Initialize global rate limiter if not exists
        if AkshareClient._global_rate_limiter is None:
            with AkshareClient._rate_limiter_lock:
                if AkshareClient._global_rate_limiter is None:
                    AkshareClient._global_rate_limiter = RateLimiter(
                        calls=rate_limit_calls,
                        period=rate_limit_period,
                    )
                    logger.info(
                        f"Global rate limiter initialized: {rate_limit_calls} calls per {rate_limit_period}s"
                    )

        self.rate_limiter = AkshareClient._global_rate_limiter

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
            return quote_data.iloc[0].to_dict()

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
            return results[:20]

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

            return info

        except NotFoundError:
            logger.warning(f"Stock info not found for {symbol}")
            return {}
        except Exception as e:
            logger.error(f"Error fetching stock info for {symbol}: {e}")
            # Return empty dict instead of raising
            return {}
