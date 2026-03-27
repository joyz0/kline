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

### ⚠️ macOS 用户注意

如果在安装过程中遇到 `curl-cffi` 构建失败的错误，请查看 [INSTALL_GUIDE.md](./INSTALL_GUIDE.md) 获取详细解决方案。

### 方式 1：使用 pip（推荐）

```bash
cd akshare

# 创建虚拟环境（推荐）
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 方式 2：使用自动安装脚本

```bash
cd akshare
./install.sh
```

### 方式 3：使用 uv

```bash
cd akshare
uv sync
```

**注意**: `uv sync` 可能会因为 `curl-cffi` 包的构建问题失败。如果遇到错误，请使用方式 1 或查看 [INSTALL_GUIDE.md](./INSTALL_GUIDE.md)。

### 方式 4：使用 Docker（最可靠）

```bash
# 构建镜像
docker build -t akshare-mcp .

# 运行测试
docker run -it akshare-mcp python example.py
```

## 使用方法

### 1. 作为 MCP 服务运行（stdio 传输）

```bash
# 使用 uv
uv run python -m akshare --transport stdio

# 或使用 pip
python -m akshare --transport stdio
```

### 2. 作为 HTTP 服务运行

```bash
# 使用 uv
uv run python -m akshare --transport http --http-port 8000

# 或使用 pip
python -m akshare --transport http --http-port 8000
```

### 3. 在 Claude Desktop 中配置

在 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "akshare": {
      "command": "python",
      "args": ["-m", "akshare"],
      "cwd": "/path/to/akshare",
      "env": {}
    }
  }
}
```

### 4. 直接作为库使用

```python
from akshare_client import AkshareClient
from stock_quotes_service import StockQuotesService
from schemas import StockQuoteInput

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

| 特性 | Akshare MCP | Yahoo Finance MCP |
|------|-------------|-------------------|
| 数据源 | 中国 A 股市场 | 美股、港股、加密货币 |
| 语言 | Python | TypeScript |
| 实时数据 | ✅ | ✅ |
| 历史数据 | ✅ | ✅ |
| 股票搜索 | ✅ | ✅ |
| 缓存支持 | ❌ | ✅ |
| 速率限制 | ❌ | ✅ |

## 开发说明

### 项目结构

```
akshare/
├── __init__.py           # 包初始化
├── __main__.py           # 模块入口
├── index.py              # 主入口
├── server.py             # MCP 服务器实现
├── akshare_client.py     # Akshare API 客户端
├── stock_quotes_service.py  # 业务逻辑层
├── tool_registration.py  # MCP 工具注册
├── schemas.py            # Pydantic 数据模型
├── errors.py             # 自定义异常
├── example.py            # 使用示例
├── requirements.txt      # Python 依赖
└── pyproject.toml        # 项目配置
```

### 架构设计

采用三层架构：

1. **Client 层** (`akshare_client.py`): 封装 Akshare API
2. **Service 层** (`stock_quotes_service.py`): 业务逻辑处理
3. **Transport 层** (`server.py`, `tool_registration.py`): MCP 协议处理

### 添加新功能

1. 在 `schemas.py` 中添加数据模型
2. 在 `akshare_client.py` 中实现数据获取
3. 在 `stock_quotes_service.py` 中实现业务逻辑
4. 在 `tool_registration.py` 中注册 MCP 工具

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
