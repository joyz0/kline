#!/usr/bin/env python3
"""Standalone Akshare MCP server entrypoint."""

from __future__ import annotations

import argparse
import json
import logging
import pathlib
import sys

PACKAGE_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_cli_mode(argv: list[str]) -> None:
    from akshare_mcp_server.core.schemas import (
        HistoricalDataInput,
        StockQuoteInput,
        StockQuotesInput,
        StockSearchInput,
    )
    from akshare_mcp_server.core.service_factory import get_stock_service

    if len(argv) < 1:
        print("Usage: server.py --cli <command> [args...]", file=sys.stderr)
        print("Commands:", file=sys.stderr)
        print("  get_quote <ticker> [fields...]", file=sys.stderr)
        print("  get_quotes <ticker1,ticker2,...> [fields...]", file=sys.stderr)
        print("  search <query>", file=sys.stderr)
        print("  history <ticker> <from_date> <to_date> [fields...]", file=sys.stderr)
        sys.exit(1)

    command = argv[0]
    args = argv[1:]
    service = get_stock_service()

    try:
        if command == "get_quote":
            ticker = args[0]
            fields = args[1:] if len(args) > 1 else None
            input_data = StockQuoteInput(ticker=ticker, fields=fields)
            result = service.get_quote(input_data)
            print(json.dumps(result.model_dump(exclude_none=True), ensure_ascii=False))
            return

        if command == "get_quotes":
            tickers = args[0].split(",")
            fields = args[1:] if len(args) > 1 else None
            input_data = StockQuotesInput(tickers=tickers, fields=fields)
            results = service.get_quotes(input_data)
            print(
                json.dumps(
                    [result.model_dump(exclude_none=True) for result in results],
                    ensure_ascii=False,
                )
            )
            return

        if command == "search":
            query = args[0]
            input_data = StockSearchInput(query=query)
            results = service.search(input_data)
            print(
                json.dumps(
                    {"results": [result.model_dump() for result in results]},
                    ensure_ascii=False,
                )
            )
            return

        if command == "history":
            ticker = args[0]
            from_date = args[1]
            to_date = args[2]
            fields = args[3:] if len(args) > 3 else None
            input_data = HistoricalDataInput(
                ticker=ticker,
                from_date=from_date,
                to_date=to_date,
                fields=fields,
            )
            results = service.get_historical_data(input_data)
            print(
                json.dumps(
                    {"closingPrices": [result.model_dump(exclude_none=True) for result in results]},
                    ensure_ascii=False,
                )
            )
            return

        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        logger.error("CLI command failed: %s", exc)
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


def main() -> None:
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

    args, extra = parser.parse_known_args()

    if args.cli:
        run_cli_mode(extra)
        return

    try:
        from akshare_mcp_server.app import create_app

        mcp = create_app()
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

    if args.transport == "http":
        mcp.run(transport="streamable-http", host=args.host, port=args.port)
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
