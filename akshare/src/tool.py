#!/usr/bin/env python3
"""
Command-line interface for calling Akshare service functions.
This is called by TypeScript AkshareAPIClient via stdio.

Usage:
    python -m akshare.tool get_quote '{"symbol": "600519"}'
"""

import json
import sys
from typing import Any

from src.core.akshare_client import AkshareClient
from src.core.stock_quotes_service import StockQuotesService
from src.core.schemas import (
    StockQuoteInput,
    StockQuotesInput,
    StockSearchInput,
    HistoricalDataInput,
)


def call_get_quote(args: dict[str, Any]) -> dict[str, Any]:
    """Get realtime quote for a single stock."""
    service = StockQuotesService()
    input_data = StockQuoteInput(**args)
    result = service.get_quote(input_data)
    return result.model_dump(exclude_none=True)


def call_get_quotes(args: dict[str, Any]) -> list[dict[str, Any]]:
    """Get realtime quotes for multiple stocks."""
    service = StockQuotesService()
    input_data = StockQuotesInput(**args)
    results = service.get_quotes(input_data)
    return [r.model_dump(exclude_none=True) for r in results]


def call_search(args: dict[str, Any]) -> list[dict[str, Any]]:
    """Search for stocks."""
    service = StockQuotesService()
    input_data = StockSearchInput(**args)
    results = service.search(input_data)
    return [r.model_dump() for r in results]


def call_get_historical(args: dict[str, Any]) -> list[dict[str, Any]]:
    """Get historical data for a stock."""
    service = StockQuotesService()
    input_data = HistoricalDataInput(**args)
    results = service.get_historical_data(input_data)
    return [r.model_dump(exclude_none=True) for r in results]


def main():
    """Main entry point."""
    if len(sys.argv) != 3:
        print(
            json.dumps({"error": "Usage: python -m akshare.tool <function> <json_args>"}),
            file=sys.stdout,
        )
        sys.exit(1)

    function_name = sys.argv[1]
    try:
        args = json.loads(sys.argv[2])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}), file=sys.stdout)
        sys.exit(1)

    functions = {
        "get_quote": call_get_quote,
        "get_quotes": call_get_quotes,
        "search": call_search,
        "get_historical": call_get_historical,
    }

    if function_name not in functions:
        print(
            json.dumps({"error": f"Unknown function: {function_name}"}),
            file=sys.stdout,
        )
        sys.exit(1)

    try:
        result = functions[function_name](args)
        print(json.dumps(result), file=sys.stdout)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
