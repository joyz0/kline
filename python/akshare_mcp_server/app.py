"""FastMCP application construction for Akshare MCP server."""

from __future__ import annotations

from typing import Any

from .core.schemas import HistoricalDataInput, StockQuoteInput, StockQuotesInput, StockSearchInput
from .core.service_factory import get_stock_service


def get_fastmcp():
    try:
        from mcp.server.fastmcp import FastMCP

        return FastMCP
    except ImportError as exc:
        raise RuntimeError(
            "mcp package not installed. Run: pip install mcp"
        ) from exc


def create_app():
    fast_mcp = get_fastmcp()
    mcp = fast_mcp("akshare-stock-quotes")

    @mcp.tool()
    def get_stock_quote(
        ticker: str,
        fields: list[str] | None = None,
    ) -> dict[str, Any]:
        service = get_stock_service()
        input_data = StockQuoteInput(ticker=ticker, fields=fields)
        result = service.get_quote(input_data)
        return result.model_dump(exclude_none=True)

    @mcp.tool()
    def get_stock_quotes(
        tickers: list[str],
        fields: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        service = get_stock_service()
        input_data = StockQuotesInput(tickers=tickers, fields=fields)
        results = service.get_quotes(input_data)
        return [result.model_dump(exclude_none=True) for result in results]

    @mcp.tool()
    def search_stocks(query: str) -> dict[str, Any]:
        service = get_stock_service()
        input_data = StockSearchInput(query=query)
        results = service.search(input_data)
        return {"results": [result.model_dump() for result in results]}

    @mcp.tool()
    def get_historical_data(
        ticker: str,
        from_date: str | None = None,
        to_date: str | None = None,
        fields: list[str] | None = None,
        fromDate: str | None = None,
        toDate: str | None = None,
    ) -> dict[str, Any]:
        service = get_stock_service()
        resolved_from_date = from_date or fromDate
        resolved_to_date = to_date or toDate
        input_data = HistoricalDataInput(
            ticker=ticker,
            from_date=resolved_from_date,
            to_date=resolved_to_date,
            fields=fields,
        )
        results = service.get_historical_data(input_data)
        return {"closingPrices": [result.model_dump(exclude_none=True) for result in results]}

    return mcp
