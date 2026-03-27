#!/usr/bin/env python3
"""
Example usage of the Akshare MCP server.

This script demonstrates how to use the Akshare MCP server directly
without going through the MCP protocol.
"""

from akshare_client import AkshareClient
from stock_quotes_service import StockQuotesService
from schemas import StockQuoteInput, StockQuotesInput, StockSearchInput, HistoricalDataInput


def main():
    """Run example queries."""
    print("=== Akshare MCP Server Example ===\n")
    
    # Initialize service
    client = AkshareClient()
    service = StockQuotesService(akshare_client=client)
    
    # Example 1: Get single stock quote
    print("1. Getting quote for 600519 (Kweichow Moutai)...")
    try:
        quote_input = StockQuoteInput(ticker="600519")
        quote = service.get_quote(quote_input)
        print(f"   Symbol: {quote.symbol}")
        print(f"   Name: {quote.name}")
        print(f"   Price: {quote.current_price}")
        print(f"   Change: {quote.change} ({quote.change_percent}%)")
        print()
    except Exception as e:
        print(f"   Error: {e}\n")
    
    # Example 2: Get multiple stock quotes
    print("2. Getting quotes for multiple stocks...")
    try:
        quotes_input = StockQuotesInput(tickers=["600519", "000001", "300750"])
        quotes = service.get_quotes(quotes_input)
        for quote in quotes:
            print(f"   {quote.symbol}: {quote.name} - {quote.current_price}")
        print()
    except Exception as e:
        print(f"   Error: {e}\n")
    
    # Example 3: Search for stocks
    print("3. Searching for stocks with '茅台'...")
    try:
        search_input = StockSearchInput(query="茅台")
        results = service.search(search_input)
        for result in results[:5]:  # Show first 5 results
            print(f"   {result.symbol}: {result.name} ({result.exchange})")
        print()
    except Exception as e:
        print(f"   Error: {e}\n")
    
    # Example 4: Get historical data
    print("4. Getting historical data for 600519 (last 5 days)...")
    try:
        from datetime import datetime, timedelta
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=10)
        
        historical_input = HistoricalDataInput(
            ticker="600519",
            from_date=start_date.strftime("%Y-%m-%d"),
            to_date=end_date.strftime("%Y-%m-%d"),
        )
        historical_data = service.get_historical_data(historical_input)
        for data in historical_data[-5:]:  # Show last 5 days
            print(f"   {data.date}: Close={data.close}, Volume={data.volume}")
        print()
    except Exception as e:
        print(f"   Error: {e}\n")
    
    print("=== Examples Complete ===")


if __name__ == "__main__":
    main()
