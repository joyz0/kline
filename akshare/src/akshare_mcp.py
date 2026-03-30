#!/usr/bin/env python3
"""
MCP Server for Akshare Stock Quotes

This server provides tools for fetching A-share stock quotes from Akshare
through the Model Context Protocol (MCP).

Usage:
    # MCP Mode (for Claude Desktop, MCP Inspector, etc.)
    python -m akshare_mcp                    # Start with stdio transport
    python -m akshare_mcp --transport http   # Start with HTTP transport

    # CLI Mode (for TypeScript LangGraph)
    python -m akshare_mcp --cli get_stock_quote 600519
    python -m akshare_mcp --cli get_quotes 600519,000001
    python -m akshare_mcp --cli search 茅台
    python -m akshare_mcp --cli history 600519 2024-01-01 2024-12-31
"""

import sys
from typing import Any


def get_fastmcp():
    """Lazy import FastMCP to avoid import errors if mcp is not installed."""
    try:
        from mcp.server.fastmcp import FastMCP
        return FastMCP
    except ImportError:
        print("Error: mcp package not installed. Run: pip install mcp", file=sys.stderr)
        sys.exit(1)


FastMCP = get_fastmcp()
mcp = FastMCP("akshare-stock-quotes")

_stock_service: Any = None


def get_stock_service():
    """Get or create the stock quotes service instance (lazy import)."""
    global _stock_service
    if _stock_service is None:
        try:
            from src.core.akshare_client import AkshareClient
            from akshare.src.core.akshare_service import StockQuotesService

            client = AkshareClient()
            _stock_service = StockQuotesService(akshare_client=client)
        except ImportError as e:
            print(
                f"Error: Failed to import akshare modules: {e}\n"
                "Please ensure akshare dependencies are installed:\n"
                "  uv sync --extra full\n"
                "or:\n"
                "  pip install akshare pydantic cachetools pyrate-limiter",
                file=sys.stderr,
            )
            sys.exit(1)
    return _stock_service


@mcp.tool()
def get_stock_quote(
    ticker: str,
    fields: list[str] | None = None,
) -> dict[str, Any]:
    """
    Fetch current stock quote data from Akshare for a given ticker symbol.

    Returns price, volume, market cap, P/E ratio, and other key metrics for A-share stocks.
    Supports Shanghai (60xxxx) and Shenzhen (00xxxx, 30xxxx) stocks.

    Args:
        ticker: A-share stock code (e.g., 600519 for 贵州茅台, 000001 for 平安银行)
        fields: Optional list of specific fields to return

    Returns:
        Stock quote data including current_price, change, volume, etc.
    """
    service = get_stock_service()
    from src.core.schemas import StockQuoteInput

    input_data = StockQuoteInput(ticker=ticker, fields=fields)
    result = service.get_quote(input_data)
    return result.model_dump(exclude_none=True)


@mcp.tool()
def get_stock_quotes(
    tickers: list[str],
    fields: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch current stock quote data from Akshare for multiple ticker symbols.

    Returns price, volume, market cap, and other key metrics for each ticker.
    Supports A-share stocks (Shanghai and Shenzhen).

    Args:
        tickers: List of A-share stock codes
        fields: Optional list of specific fields to return

    Returns:
        List of stock quote data
    """
    service = get_stock_service()
    from src.core.schemas import StockQuotesInput

    input_data = StockQuotesInput(tickers=tickers, fields=fields)
    results = service.get_quotes(input_data)
    return [r.model_dump(exclude_none=True) for r in results]


@mcp.tool()
def search_stocks(query: str) -> list[dict[str, Any]]:
    """
    Search for A-share stocks by company name or ticker symbol.

    Returns matching results with symbol, name, and exchange information.

    Args:
        query: Search query (company name like '茅台' or ticker like '600519')

    Returns:
        List of matching stocks with symbol, name, and exchange
    """
    service = get_stock_service()
    from src.core.schemas import StockSearchInput

    input_data = StockSearchInput(query=query)
    results = service.search(input_data)
    return [r.model_dump() for r in results]


@mcp.tool()
def get_historical_data(
    ticker: str,
    from_date: str,
    to_date: str,
    fields: list[str] | None = None,
) -> dict[str, Any]:
    """
    Fetch historical stock data for a given ticker from a start date to an end date.

    Returns an array of historical data points (date, open, high, low, close, volume).
    Supports A-share stocks (Shanghai and Shenzhen).

    Args:
        ticker: A-share stock code (e.g., 600519)
        from_date: Start date in YYYY-MM-DD format (e.g., 2024-01-01)
        to_date: End date in YYYY-MM-DD format (e.g., 2024-12-31)
        fields: Optional list of specific fields to return

    Returns:
        Historical data with date, open, high, low, close, volume, etc.
    """
    service = get_stock_service()
    from src.core.schemas import HistoricalDataInput

    input_data = HistoricalDataInput(
        ticker=ticker,
        from_date=from_date,
        to_date=to_date,
        fields=fields,
    )
    results = service.get_historical_data(input_data)
    return {"closingPrices": [r.model_dump(exclude_none=True) for r in results]}


def run_cli_mode():
    """Run in CLI mode for direct command-line usage."""
    import json

    if len(sys.argv) < 3:
        print("Usage: python -m akshare_mcp --cli <command> [args...]", file=sys.stderr)
        print("Commands:", file=sys.stderr)
        print("  get_quote <ticker> [fields...]", file=sys.stderr)
        print("  get_quotes <ticker1,ticker2,...> [fields...]", file=sys.stderr)
        print("  search <query>", file=sys.stderr)
        print("  history <ticker> <from_date> <to_date> [fields...]", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[2]
    args = sys.argv[3:] if len(sys.argv) > 3 else []

    service = get_stock_service()
    from src.core.schemas import (
        StockQuoteInput,
        StockQuotesInput,
        StockSearchInput,
        HistoricalDataInput,
    )

    try:
        if command == "get_quote":
            ticker = args[0]
            fields = args[1:] if len(args) > 1 else None
            input_data = StockQuoteInput(ticker=ticker, fields=fields)
            result = service.get_quote(input_data)
            print(json.dumps(result.model_dump(exclude_none=True), ensure_ascii=False))

        elif command == "get_quotes":
            tickers = args[0].split(",")
            fields = args[1:] if len(args) > 1 else None
            input_data = StockQuotesInput(tickers=tickers, fields=fields)
            results = service.get_quotes(input_data)
            print(json.dumps([r.model_dump(exclude_none=True) for r in results], ensure_ascii=False))

        elif command == "search":
            query = args[0]
            input_data = StockSearchInput(query=query)
            results = service.search(input_data)
            print(json.dumps({"results": [r.model_dump() for r in results]}, ensure_ascii=False))

        elif command == "history":
            ticker = args[0]
            from_date = args[1]
            to_date = args[2]
            fields = args[3:] if len(args) > 3 else None
            input_data = HistoricalDataInput(
                ticker=ticker, from_date=from_date, to_date=to_date, fields=fields
            )
            results = service.get_historical_data(input_data)
            print(json.dumps({"closingPrices": [r.model_dump(exclude_none=True) for r in results]}, ensure_ascii=False))

        else:
            print(f"Unknown command: {command}", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point for the MCP server."""
    import argparse

    parser = argparse.ArgumentParser(description="Akshare MCP Server")
    parser.add_argument(
        "--cli",
        action="store_true",
        help="Run in CLI mode instead of MCP mode",
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "http"],
        default="stdio",
        help="Transport type (default: stdio)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=3001,
        help="HTTP port (default: 3001)",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="HTTP host (default: 0.0.0.0)",
    )

    args = parser.parse_args()

    if args.cli:
        run_cli_mode()
    elif args.transport == "http":
        mcp.run(transport="streamable-http", host=args.host, port=args.port)
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
