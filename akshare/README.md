# Akshare MCP Server

基于 Akshare 的股市数据 MCP（Model Context Protocol）服务，专注于 A 股市场（上海和深圳证券交易所）。

## 功能特性

- 📊 **实时行情查询** - 获取 A 股股票的实时行情数据
- 🔍 **股票搜索** - 通过公司名称或代码搜索股票
- 📈 **历史数据** - 获取股票的历史交易数据
- 🚀 **批量查询** - 支持同时查询多只股票
- 🎯 **字段过滤** - 支持自定义返回字段

## 安装的依赖

- Python 3.10+
- akshare >= 1.12.0
- mcp >= 1.0.0
- pydantic >= 2.0.0

## 安装

```bash
cd akshare
uv venv --python 3.14
source .venv/bin/activate
uv sync --extra full
```

## 使用方法

### 1. 作为 MCP 服务运行（stdio 传输）

```bash
# 使用 uv
uv run akshare_mcp

# 或使用 pip
akshare_mcp
```

### 2. 作为 HTTP 服务运行

```bash
# 使用 uv
uv run akshare_mcp --transport http --port 3001

# 或使用 pip
akshare_mcp --transport http --port 3001
```

### 3. 在 Claude Desktop / Trae 中配置

#### 方式 A：使用可执行文件（推荐）

```json
{
  "mcpServers": {
    "akshare": {
      "command": "/path/to/kline/akshare/akshare_mcp",
      "args": [],
      "env": {}
    }
  }
}
```

#### 方式 B：使用 uv run

```json
{
  "mcpServers": {
    "akshare": {
      "command": "uv",
      "args": ["run", "akshare_mcp"],
      "cwd": "/path/to/kline/akshare",
      "env": {}
    }
  }
}
```

### 4. MCP Prompt 示例

Claude Desktop 连接 MCP Server 后，可以直接用自然语言调用工具：

```
# 查询股票行情
查询贵州茅台(600519)的当前价格和涨跌幅

# 批量查询
查询以下 A 股的行情：600519, 000001, 300750

# 搜索股票
帮我搜索"宁德时代"相关的股票

# 获取历史数据
获取茅台(600519)最近一个月的历史收盘价
```

### 5. 直接作为库使用

```python
from src.core.akshare_client import AkshareClient
from src.core.stock_quotes_service import StockQuotesService
from src.core.schemas import StockQuoteInput, StockSearchInput, HistoricalDataInput

# 初始化服务
client = AkshareClient()
service = StockQuotesService(akshare_client=client)

# 获取单只股票行情
quote = service.get_quote(StockQuoteInput(ticker="600519"))
print(f"{quote.symbol}: {quote.name} - {quote.current_price}")

# 搜索股票
results = service.search(StockSearchInput(query="茅台"))

# 获取历史数据
historical = service.get_historical_data(
    HistoricalDataInput(
        ticker="600519",
        from_date="2024-01-01",
        to_date="2024-12-31"
    )
)
```

### 6. CLI 模式（用于 TypeScript LangGraph）

```bash
# 获取单只股票行情
uv run akshare_mcp --cli get_quote 600519

# 批量获取股票行情
uv run akshare_mcp --cli get_quotes 600519,000001

# 搜索股票
uv run akshare_mcp --cli search 茅台

# 获取历史数据
uv run akshare_mcp --cli history 600519 2024-01-01 2024-12-31
```

## 可用的 MCP 工具

### get_stock_quote

获取单只股票的实时行情数据。

**参数：**

- `ticker` (string): 股票代码（如：600519, 000001）
- `fields` (array, optional): 指定返回的字段

**示例：**

```json
{
  "ticker": "600519",
  "fields": ["symbol", "name", "current_price", "change_percent"]
}
```

### get_stock_quotes

批量获取多只股票的实时行情数据。

**参数：**

- `tickers` (array): 股票代码列表
- `fields` (array, optional): 指定返回的字段

**示例：**

```json
{
  "tickers": ["600519", "000001", "300750"]
}
```

### search_stocks

通过公司名称或股票代码搜索股票。

**参数：**

- `query` (string): 搜索关键词

**示例：**

```json
{
  "query": "茅台"
}
```

### get_historical_data

获取股票的历史交易数据。

**参数：**

- `ticker` (string): 股票代码
- `from_date` (string): 开始日期（YYYY-MM-DD）
- `to_date` (string): 结束日期（YYYY-MM-DD）
- `fields` (array, optional): 指定返回的字段

**示例：**

```json
{
  "ticker": "600519",
  "from_date": "2024-01-01",
  "to_date": "2024-12-31",
  "fields": ["date", "close", "volume"]
}
```

## 返回字段说明

### 股票行情字段

- `symbol`: 股票代码
- `name`: 股票名称
- `exchange`: 交易所（SH/SZ）
- `currency`: 货币（CNY）
- `current_price`: 当前价格
- `change`: 涨跌额
- `change_percent`: 涨跌幅
- `volume`: 成交量
- `amount`: 成交额
- `market_cap`: 总市值
- `pe_ratio`: 市盈率
- `pb_ratio`: 市净率
- `high_52week`: 52 周最高价
- `low_52week`: 52 周最低价
- `open_price`: 今开
- `high_price`: 最高价
- `low_price`: 最低价
- `pre_close`: 昨收
- `turnover_rate`: 换手率

### 历史数据字段

- `date`: 日期
- `open`: 开盘价
- `high`: 最高价
- `low`: 最低价
- `close`: 收盘价
- `volume`: 成交量
- `amount`: 成交额
- `amplitude`: 振幅
- `pct_change`: 涨跌幅
- `turnover_rate`: 换手率

## 测试示例

运行示例脚本：

```bash
cd akshare
uv run python example.py
```

## 与 Yahoo Finance MCP 的对比

| 特性     | Akshare MCP   | Yahoo Finance MCP    |
| -------- | ------------- | -------------------- |
| 数据源   | 中国 A 股市场 | 美股、港股、加密货币 |
| 语言     | Python        | TypeScript           |
| 实时数据 | ✅            | ✅                   |
| 历史数据 | ✅            | ✅                   |
| 股票搜索 | ✅            | ✅                   |
| 缓存支持 | ❌            | ✅                   |
| 速率限制 | ❌            | ✅                   |

## 开发说明

### 架构设计

采用两层架构：

1. **Client 层** (`src/core/akshare_client.py`): 封装 Akshare API
2. **Service 层** (`src/core/stock_quotes_service.py`): 业务逻辑处理
3. **MCP Server** (`src/mcp_server.py`): MCP 协议处理和工具注册

### 添加新功能

1. 在 `src/core/schemas.py` 中添加数据模型
2. 在 `src/core/akshare_client.py` 中实现数据获取
3. 在 `src/core/stock_quotes_service.py` 中实现业务逻辑
4. 在 `src/mcp_server.py` 中使用 `@mcp.tool()` 装饰器注册工具

## 常见问题

### Q: 为什么获取数据失败？

A: 检查网络连接，确保可以访问东方财富网等数据源。

### Q: 支持哪些市场？

A: 目前仅支持中国 A 股市场（上海和深圳证券交易所）。

### Q: 数据更新频率？

A: 实时数据在交易时间内每 3-5 秒更新一次。

### Q: 如何处理速率限制？

A: Akshare 目前没有严格的速率限制，但建议添加适当的延迟避免被封锁。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
