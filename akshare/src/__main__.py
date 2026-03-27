"""Allow running the package as a module: python -m akshare"""

from core.akshare_client import AkshareClient
from core.stock_quotes_service import StockQuotesService
import json
import sys


def main():
    """Main entry point for the Akshare data retrieval service."""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "--help" or command == "-h":
            print("Akshare Data Retrieval Service")
            print("Usage:")
            print("  python -m akshare --help          Show this help")
            print("  python -m akshare quote <ticker>   Get stock quote")
            print("  python -m akshare search <query>  Search stocks")
            print("  python -m akshare history <ticker> <from_date> <to_date>  Get historical data")
            return
        elif command == "quote" and len(sys.argv) >= 3:
            ticker = sys.argv[2]
            client = AkshareClient()
            service = StockQuotesService(client)
            try:
                from core.schemas import StockQuoteInput
                result = service.get_quote(StockQuoteInput(ticker=ticker))
                print(json.dumps(result.model_dump(exclude_none=True), indent=2, ensure_ascii=False))
            except Exception as e:
                print(json.dumps({"error": str(e)}, indent=2, ensure_ascii=False))
            return
        elif command == "search" and len(sys.argv) >= 3:
            query = sys.argv[2]
            client = AkshareClient()
            service = StockQuotesService(client)
            try:
                from core.schemas import StockSearchInput
                results = service.search(StockSearchInput(query=query))
                print(json.dumps({"results": [r.model_dump() for r in results]}, indent=2, ensure_ascii=False))
            except Exception as e:
                print(json.dumps({"error": str(e)}, indent=2, ensure_ascii=False))
            return
        elif command == "history" and len(sys.argv) >= 5:
            ticker = sys.argv[2]
            from_date = sys.argv[3]
            to_date = sys.argv[4]
            client = AkshareClient()
            service = StockQuotesService(client)
            try:
                from core.schemas import HistoricalDataInput
                results = service.get_historical_data(HistoricalDataInput(
                    ticker=ticker, from_date=from_date, to_date=to_date
                ))
                print(json.dumps({"closingPrices": [r.model_dump(exclude_none=True) for r in results]}, indent=2, ensure_ascii=False))
            except Exception as e:
                print(json.dumps({"error": str(e)}, indent=2, ensure_ascii=False))
            return
    
    print("Akshare Data Retrieval Service")
    print("Use --help for usage information")


if __name__ == "__main__":
    main()
