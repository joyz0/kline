"""Akshare client for fetching stock data."""

from __future__ import annotations

import importlib
import logging
import threading
from typing import Any, Optional

import pandas as pd

from .cache import RateLimiter
from .errors import DataFetchError, NotFoundError

logger = logging.getLogger(__name__)


def _get_akshare():
    return importlib.import_module("akshare")


class AkshareClient:
    """Client for interacting with Akshare API with shared rate limiting."""

    _global_rate_limiter: Optional[RateLimiter] = None
    _rate_limiter_lock = threading.Lock()

    def __init__(self, rate_limit_calls: int = 10, rate_limit_period: int = 60):
        if AkshareClient._global_rate_limiter is None:
            with AkshareClient._rate_limiter_lock:
                if AkshareClient._global_rate_limiter is None:
                    AkshareClient._global_rate_limiter = RateLimiter(
                        calls=rate_limit_calls,
                        period=rate_limit_period,
                    )
                    logger.info(
                        "Global rate limiter initialized: %s calls per %ss",
                        rate_limit_calls,
                        rate_limit_period,
                    )

        self.rate_limiter = AkshareClient._global_rate_limiter

    def get_realtime_quote(self, symbol: str) -> dict[str, Any]:
        self.rate_limiter.wait_and_acquire(resource="quote")

        try:
            df = _get_akshare().stock_zh_a_spot_em()
            symbol_col = "代码" if "代码" in df.columns else "symbol"
            if symbol_col not in df.columns:
                raise DataFetchError(f"Unexpected dataframe structure: {df.columns}")

            quote_data = df[df[symbol_col] == symbol]
            if quote_data.empty:
                raise NotFoundError(f"Stock symbol '{symbol}' not found")

            return quote_data.iloc[0].to_dict()
        except NotFoundError:
            raise
        except Exception as exc:
            logger.error("Error fetching realtime quote for %s: %s", symbol, exc)
            raise DataFetchError(f"Failed to fetch realtime quote: {exc}")

    def get_multiple_realtime_quotes(self, symbols: list[str]) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for symbol in symbols:
            try:
                results.append(self.get_realtime_quote(symbol))
            except Exception as exc:
                logger.warning("Failed to fetch quote for %s: %s", symbol, exc)
        return results

    def search_stocks(self, query: str) -> list[dict[str, Any]]:
        self.rate_limiter.wait_and_acquire(resource="search")

        try:
            df = _get_akshare().stock_zh_a_spot_em()
            symbol_col = "代码" if "代码" in df.columns else "symbol"
            name_col = "名称" if "名称" in df.columns else "name"
            exchange_col = "交易所" if "交易所" in df.columns else "market" if "market" in df.columns else None

            query_upper = query.upper()
            mask = df[symbol_col].astype(str).str.contains(query_upper, case=False, na=False)

            if name_col in df.columns:
                name_mask = df[name_col].astype(str).str.contains(query, case=False, na=False)
                mask = mask | name_mask

            results_df = df[mask]
            results: list[dict[str, Any]] = []
            for _, row in results_df.iterrows():
                symbol = row.get(symbol_col, "")
                exchange = row[exchange_col] if exchange_col and exchange_col in row else (
                    "SH" if str(symbol).startswith("6") else "SZ" if str(symbol).startswith(("0", "3")) else "UNKNOWN"
                )
                results.append(
                    {
                        "symbol": symbol,
                        "name": row.get(name_col, ""),
                        "exchange": exchange,
                    }
                )

            return results[:20]
        except Exception as exc:
            logger.error("Error searching stocks: %s", exc)
            raise DataFetchError(f"Failed to search stocks: {exc}")

    def get_historical_data(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        self.rate_limiter.wait_and_acquire(resource="history")

        try:
            start_date_formatted = start_date.replace("-", "")
            end_date_formatted = end_date.replace("-", "")
            df = _get_akshare().stock_zh_a_hist(
                symbol=symbol,
                period="daily",
                start_date=start_date_formatted,
                end_date=end_date_formatted,
                adjust="qfq",
            )

            if df.empty:
                raise NotFoundError(
                    f"No historical data found for {symbol} in the given date range"
                )

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

            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

            return df
        except NotFoundError:
            raise
        except Exception as exc:
            logger.error("Error fetching historical data for %s: %s", symbol, exc)
            raise DataFetchError(f"Failed to fetch historical data: {exc}")
