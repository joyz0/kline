"""Service for fetching stock quotes from Akshare."""

import logging
from datetime import datetime
from typing import Any, Optional

from akshare_client import AkshareClient
from cache import CacheManager
from errors import DataFetchError, NotFoundError, ValidationError
from schemas import (
    HistoricalData,
    HistoricalDataInput,
    StockQuoteInput,
    StockQuoteResponse,
    StockQuotesInput,
    StockSearchInput,
    StockSearchResult,
)

logger = logging.getLogger(__name__)


class StockQuotesService:
    """
    Service for fetching stock quotes and related data.
    
    Manages caching at the service layer to separate business logic
    from data access concerns.
    """

    def __init__(
        self,
        akshare_client: Optional[AkshareClient] = None,
        cache_ttl: int = 300,
    ):
        """
        Initialize the StockQuotesService.

        Args:
            akshare_client: Optional AkshareClient instance
            cache_ttl: Default cache time to live in seconds (default: 5 minutes)
        """
        self.akshare_client = akshare_client or AkshareClient()
        self.cache_manager = CacheManager(maxsize=1000, ttl=cache_ttl)
        
        logger.info(f"StockQuotesService initialized with cache_ttl={cache_ttl}s")

    def get_quote(self, input_data: StockQuoteInput) -> StockQuoteResponse:
        """
        Fetch a stock quote for the given ticker symbol.

        Args:
            input_data: Stock quote input containing ticker and optional fields

        Returns:
            StockQuoteResponse: Stock quote data

        Raises:
            NotFoundError: If the stock is not found
            DataFetchError: If data fetching fails
        """
        ticker = input_data.ticker
        fields = input_data.fields
        cache_key = f"quote:{ticker}:{','.join(fields) if fields else 'all'}"

        # Check cache first
        cached_response = self.cache_manager.get(cache_key)
        if cached_response is not None:
            logger.info(f"Cache hit for quote: {ticker}")
            return cached_response

        try:
            # Fetch realtime quote data
            quote_data = self.akshare_client.get_realtime_quote(ticker)

            # Map to StockQuoteResponse
            response = self._map_to_quote_response(quote_data, ticker, fields)

            # Cache the result
            self.cache_manager.set(cache_key, response)

            return response

        except (NotFoundError, DataFetchError):
            raise
        except Exception as e:
            logger.error(f"Error fetching quote for {ticker}: {e}")
            raise DataFetchError(f"Failed to fetch stock quote: {str(e)}")

    def get_quotes(self, input_data: StockQuotesInput) -> list[StockQuoteResponse]:
        """
        Fetch multiple stock quotes for the given ticker symbols.

        Args:
            input_data: Stock quotes input containing tickers and optional fields

        Returns:
            list[StockQuoteResponse]: List of stock quote data
        """
        tickers = input_data.tickers
        fields = input_data.fields
        sorted_tickers = sorted(tickers)
        cache_key = f"quotes:{','.join(sorted_tickers)}:{','.join(fields) if fields else 'all'}"

        # Check cache first
        cached_responses = self.cache_manager.get(cache_key)
        if cached_responses is not None:
            logger.info(f"Cache hit for multiple quotes: {sorted_tickers}")
            return cached_responses

        results = []
        for ticker in tickers:
            try:
                quote = self.get_quote(StockQuoteInput(ticker=ticker, fields=fields))
                results.append(quote)
            except Exception as e:
                logger.warning(f"Failed to fetch quote for {ticker}: {e}")
                # Continue with other tickers

        # Cache the results
        self.cache_manager.set(cache_key, results)

        return results

    def search(self, input_data: StockSearchInput) -> list[StockSearchResult]:
        """
        Search for stocks by name or symbol.

        Args:
            input_data: Stock search input containing query

        Returns:
            list[StockSearchResult]: List of search results
        """
        query = input_data.query
        cache_key = f"search:{query}"

        # Check cache first
        cached_results = self.cache_manager.get(cache_key)
        if cached_results is not None:
            logger.info(f"Cache hit for search: {query}")
            return cached_results

        try:
            search_results = self.akshare_client.search_stocks(query)

            # Map to StockSearchResult
            results = [
                StockSearchResult(
                    symbol=item.get("symbol", ""),
                    name=item.get("name", ""),
                    exchange=item.get("exchange", ""),
                )
                for item in search_results
            ]

            # Cache the result (30 minutes for search)
            self.cache_manager.set(cache_key, results, ttl=1800)

            return results

        except Exception as e:
            logger.error(f"Error searching stocks: {e}")
            raise DataFetchError(f"Failed to search stocks: {str(e)}")

    def get_historical_data(
        self, input_data: HistoricalDataInput
    ) -> list[HistoricalData]:
        """
        Fetch historical stock data for a given ticker and date range.

        Args:
            input_data: Historical data input containing ticker, date range, and optional fields

        Returns:
            list[HistoricalData]: List of historical data points

        Raises:
            ValidationError: If date validation fails
            NotFoundError: If no data is found
        """
        ticker = input_data.ticker
        from_date = input_data.from_date
        to_date = input_data.to_date
        fields = input_data.fields
        cache_key = f"history:{ticker}:{from_date}:{to_date}:{','.join(fields) if fields else 'all'}"

        # Check cache first
        cached_data = self.cache_manager.get(cache_key)
        if cached_data is not None:
            logger.info(f"Cache hit for historical data: {ticker}")
            return cached_data

        # Validate dates
        self._validate_dates(from_date, to_date)

        try:
            # Fetch historical data
            df = self.akshare_client.get_historical_data(
                symbol=ticker, start_date=from_date, end_date=to_date
            )

            # Map to HistoricalData list
            historical_data = self._map_to_historical_data(df, fields)

            # Cache the result (1 hour for historical data)
            self.cache_manager.set(cache_key, historical_data, ttl=3600)

            return historical_data

        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            logger.error(f"Error fetching historical data for {ticker}: {e}")
            raise DataFetchError(f"Failed to fetch historical data: {str(e)}")

    def _map_to_quote_response(
        self, quote_data: dict, ticker: str, requested_fields: Optional[list[str]]
    ) -> StockQuoteResponse:
        """
        Map raw quote data to StockQuoteResponse.

        Args:
            quote_data: Raw quote data from Akshare
            ticker: Stock ticker symbol
            requested_fields: Optional list of requested fields

        Returns:
            StockQuoteResponse: Mapped quote response
        """
        # Map Akshare fields to our schema
        # Common field mappings for Chinese stock market data
        response = StockQuoteResponse(
            symbol=ticker,
            name=quote_data.get("名称", quote_data.get("name")),
            exchange=self._infer_exchange(ticker),
            currency="CNY",
            current_price=self._safe_float(
                quote_data.get("最新价", quote_data.get("last_price"))
            ),
            change=self._safe_float(
                quote_data.get("涨跌额", quote_data.get("change_amount"))
            ),
            change_percent=self._safe_float(
                quote_data.get("涨跌幅", quote_data.get("pct_change"))
            ),
            volume=self._safe_float(quote_data.get("成交量", quote_data.get("volume"))),
            amount=self._safe_float(quote_data.get("成交额", quote_data.get("amount"))),
            market_cap=self._safe_float(
                quote_data.get("总市值", quote_data.get("total_market_cap"))
            ),
            pe_ratio=self._safe_float(
                quote_data.get("市盈率", quote_data.get("pe_ratio"))
            ),
            pb_ratio=self._safe_float(
                quote_data.get("市净率", quote_data.get("pb_ratio"))
            ),
            high_52week=self._safe_float(
                quote_data.get("52 周最高", quote_data.get("high_52week"))
            ),
            low_52week=self._safe_float(
                quote_data.get("52 周最低", quote_data.get("low_52week"))
            ),
            open_price=self._safe_float(
                quote_data.get("今开", quote_data.get("open_price"))
            ),
            high_price=self._safe_float(
                quote_data.get("最高", quote_data.get("high_price"))
            ),
            low_price=self._safe_float(
                quote_data.get("最低", quote_data.get("low_price"))
            ),
            pre_close=self._safe_float(
                quote_data.get("昨收", quote_data.get("pre_close"))
            ),
            bid_price=self._safe_float(
                quote_data.get("买价", quote_data.get("bid_price"))
            ),
            ask_price=self._safe_float(
                quote_data.get("卖价", quote_data.get("ask_price"))
            ),
            bid_volume=self._safe_float(
                quote_data.get("买量", quote_data.get("bid_volume"))
            ),
            ask_volume=self._safe_float(
                quote_data.get("卖量", quote_data.get("ask_volume"))
            ),
            avg_daily_volume=self._safe_float(
                quote_data.get("成交量", quote_data.get("volume"))
            ),
            turnover_rate=self._safe_float(
                quote_data.get("换手率", quote_data.get("turnover_rate"))
            ),
            total_shares=self._safe_float(
                quote_data.get("总股本", quote_data.get("total_shares"))
            ),
            float_shares=self._safe_float(
                quote_data.get("流通股本", quote_data.get("float_shares"))
            ),
            eps=self._safe_float(quote_data.get("每股收益", quote_data.get("eps"))),
            bvps=self._safe_float(
                quote_data.get("每股净资产", quote_data.get("bvps"))
            ),
            dividend_yield=self._safe_float(
                quote_data.get("股息率", quote_data.get("dividend_yield"))
            ),
            dividend=self._safe_float(quote_data.get("分红", quote_data.get("dividend"))),
        )

        # Filter by requested fields if specified
        if requested_fields:
            filtered_data = {"symbol": response.symbol}
            for field in requested_fields:
                if hasattr(response, field):
                    value = getattr(response, field)
                    if value is not None:
                        filtered_data[field] = value
            return StockQuoteResponse(**filtered_data)

        return response

    def _map_to_historical_data(
        self, df, requested_fields: Optional[list[str]]
    ) -> list[HistoricalData]:
        """
        Map DataFrame to list of HistoricalData.

        Args:
            df: Pandas DataFrame with historical data
            requested_fields: Optional list of requested fields

        Returns:
            list[HistoricalData]: List of historical data points
        """
        results = []

        for _, row in df.iterrows():
            data_point = HistoricalData(
                date=row.get("date", ""),
                open=self._safe_float(row.get("open")),
                high=self._safe_float(row.get("high")),
                low=self._safe_float(row.get("low")),
                close=self._safe_float(row.get("close")),
                volume=self._safe_float(row.get("volume")),
                amount=self._safe_float(row.get("amount")),
                amplitude=self._safe_float(row.get("amplitude")),
                pct_change=self._safe_float(row.get("pct_change")),
                change_amount=self._safe_float(row.get("change_amount")),
                turnover_rate=self._safe_float(row.get("turnover_rate")),
            )

            # Filter by requested fields if specified
            if requested_fields:
                filtered_data = {"date": data_point.date}
                for field in requested_fields:
                    if field == "date":
                        continue
                    if hasattr(data_point, field):
                        value = getattr(data_point, field)
                        if value is not None:
                            filtered_data[field] = value
                results.append(HistoricalData(**filtered_data))
            else:
                results.append(data_point)

        return results

    def _validate_dates(self, from_date: str, to_date: str) -> None:
        """
        Validate date range.

        Args:
            from_date: Start date in YYYY-MM-DD format
            to_date: End date in YYYY-MM-DD format

        Raises:
            ValidationError: If dates are invalid
        """
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
        except ValueError:
            raise ValidationError("Invalid date format. Use YYYY-MM-DD format.")

        today = datetime.now()

        if from_dt > today:
            raise ValidationError("from_date cannot be in the future.")

        if from_dt > to_dt:
            raise ValidationError("from_date must be before or equal to to_date.")

        # Limit date range to 5 years
        if (to_dt - from_dt).days > 5 * 365:
            raise ValidationError("Date range cannot exceed 5 years.")

    def _infer_exchange(self, ticker: str) -> str:
        """
        Infer exchange from ticker symbol.

        Args:
            ticker: Stock ticker symbol

        Returns:
            str: Exchange code (SH or SZ)
        """
        if ticker.startswith("6"):
            return "SH"  # Shanghai
        elif ticker.startswith(("0", "3")):
            return "SZ"  # Shenzhen
        else:
            return "UNKNOWN"

    def _safe_float(self, value) -> Optional[float]:
        """
        Safely convert value to float.

        Args:
            value: Value to convert

        Returns:
            Optional[float]: Converted float or None
        """
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def clear_cache(self) -> None:
        """Clear all cached data."""
        self.cache_manager.clear()
        logger.info("Cache cleared")

    def get_cache_stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        return self.cache_manager.get_stats()
