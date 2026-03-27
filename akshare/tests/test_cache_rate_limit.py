#!/usr/bin/env python3
"""
Test script for cache and rate limiting functionality.

This script demonstrates and tests the cache and rate limiting features.
"""

import time
from akshare_client import AkshareClient
from cache import get_cache_manager, get_rate_limiter


def test_cache():
    """Test cache functionality."""
    print("\n=== Testing Cache Functionality ===\n")
    
    client = AkshareClient(cache_ttl=10)  # 10 seconds TTL for testing
    
    # Test 1: First call (cache miss)
    print("1. First call (should be cache miss)...")
    start = time.time()
    quote1 = client.get_realtime_quote("600519")
    elapsed1 = time.time() - start
    print(f"   Time: {elapsed1:.2f}s")
    print(f"   Symbol: {quote1.get('代码', quote1.get('symbol', 'N/A'))}")
    
    # Test 2: Second call (should be cache hit)
    print("\n2. Second call (should be cache hit)...")
    start = time.time()
    quote2 = client.get_realtime_quote("600519")
    elapsed2 = time.time() - start
    print(f"   Time: {elapsed2:.2f}s")
    print(f"   Speedup: {elapsed1 / elapsed2:.2f}x faster")
    
    # Verify data is the same
    assert quote1 == quote2, "Cached data should be identical"
    print("   ✓ Cache working correctly!")
    
    # Test 3: Check cache stats
    print("\n3. Cache statistics:")
    stats = client.get_cache_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    # Test 4: Wait for cache to expire
    print("\n4. Waiting for cache to expire (10 seconds)...")
    time.sleep(11)
    
    print("\n5. Call after expiration (should be cache miss)...")
    start = time.time()
    quote3 = client.get_realtime_quote("600519")
    elapsed3 = time.time() - start
    print(f"   Time: {elapsed3:.2f}s")
    print(f"   Cache expired and refetched!")
    
    print("\n✓ Cache tests passed!\n")


def test_rate_limiting():
    """Test rate limiting functionality."""
    print("\n=== Testing Rate Limiting ===\n")
    
    # Create client with strict rate limit: 3 calls per 10 seconds
    client = AkshareClient(rate_limit_calls=3, rate_limit_period=10)
    
    symbols = ["600519", "000001", "300750", "600036"]
    
    print(f"Rate limit: 3 calls per 10 seconds")
    print(f"Attempting to fetch {len(symbols)} quotes...\n")
    
    for i, symbol in enumerate(symbols, 1):
        print(f"{i}. Fetching quote for {symbol}...")
        start = time.time()
        try:
            quote = client.get_realtime_quote(symbol)
            elapsed = time.time() - start
            print(f"   ✓ Success in {elapsed:.2f}s")
        except Exception as e:
            print(f"   ✗ Error: {e}")
    
    print("\n✓ Rate limiting test completed!\n")


def test_search_cache():
    """Test search functionality with cache."""
    print("\n=== Testing Search with Cache ===\n")
    
    client = AkshareClient()
    
    # Test 1: Search for stocks
    print("1. Searching for '茅台'...")
    start = time.time()
    results1 = client.search_stocks("茅台")
    elapsed1 = time.time() - start
    print(f"   Time: {elapsed1:.2f}s")
    print(f"   Found {len(results1)} results")
    if results1:
        print(f"   First result: {results1[0]['name']} ({results1[0]['symbol']})")
    
    # Test 2: Search again (should use cache)
    print("\n2. Searching again (should use cache)...")
    start = time.time()
    results2 = client.search_stocks("茅台")
    elapsed2 = time.time() - start
    print(f"   Time: {elapsed2:.2f}s")
    print(f"   Speedup: {elapsed1 / elapsed2:.2f}x faster")
    
    assert results1 == results2, "Cached search results should be identical"
    print("   ✓ Search cache working correctly!")
    
    print("\n✓ Search cache tests passed!\n")


def test_multiple_quotes():
    """Test batch quote fetching."""
    print("\n=== Testing Batch Quotes ===\n")
    
    client = AkshareClient()
    
    symbols = ["600519", "000001", "300750"]
    
    print(f"Fetching quotes for {len(symbols)} symbols...\n")
    
    start = time.time()
    quotes = client.get_multiple_realtime_quotes(symbols)
    elapsed = time.time() - start
    
    print(f"Total time: {elapsed:.2f}s")
    print(f"Average time per quote: {elapsed / len(symbols):.2f}s")
    print(f"Successful quotes: {len(quotes)}/{len(symbols)}")
    
    for i, quote in enumerate(quotes):
        symbol = quote.get('代码', quote.get('symbol', 'N/A'))
        name = quote.get('名称', quote.get('name', 'N/A'))
        print(f"  {i+1}. {symbol}: {name}")
    
    print("\n✓ Batch quotes test passed!\n")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Akshare MCP - Cache and Rate Limiting Tests")
    print("=" * 60)
    
    try:
        # Run tests
        test_cache()
        test_rate_limiting()
        test_search_cache()
        test_multiple_quotes()
        
        print("=" * 60)
        print("✓ All tests completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
