# 使用 Akshare MCP 查询 A 股数据

## 快速开始（3 步）

### 步骤 1: 安装依赖

```bash
cd akshare
uv sync
```

### 步骤 2: 测试运行

```bash
uv run python example.py
```

### 步骤 3: 在 Claude Desktop 中使用

配置 `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "akshare": {
      "command": "uv",
      "args": ["run", "python", "-m", "akshare"],
      "cwd": "/Users/pl/Codes/kitz/kline/akshare"
    }
  }
}
```

## 常用查询示例

### 1. 查询单只股票

**在 Claude Desktop 中提问:**
```
帮我查询贵州茅台（600519）的当前股价和涨跌幅
```

**返回示例:**
```json
{
  "symbol": "600519",
  "name": "贵州茅台",
  "current_price": 1688.50,
  "change": 15.30,
  "change_percent": 0.91,
  "market_cap": 21200000000,
  "pe_ratio": 28.5
}
```

### 2. 批量查询多只股票

**提问:**
```
查询以下股票的实时行情：贵州茅台、五粮液、招商银行
```

**返回:**
```json
{
  "quotes": [
    {
      "symbol": "600519",
      "name": "贵州茅台",
      "current_price": 1688.50
    },
    {
      "symbol": "000858",
      "name": "五粮液",
      "current_price": 142.30
    },
    {
      "symbol": "600036",
      "name": "招商银行",
      "current_price": 32.85
    }
  ]
}
```

### 3. 搜索股票

**提问:**
```
搜索所有包含"茅台"的股票
```

**返回:**
```json
{
  "results": [
    {
      "symbol": "600519",
      "name": "贵州茅台",
      "exchange": "SH"
    },
    {
      "symbol": "000858",
      "name": "五粮液",
      "exchange": "SZ"
    }
  ]
}
```

### 4. 获取历史数据

**提问:**
```
获取贵州茅台（600519）过去一个月的历史数据
```

**返回:**
```json
{
  "closingPrices": [
    {
      "date": "2024-03-01",
      "open": 1680.00,
      "high": 1695.00,
      "low": 1675.00,
      "close": 1688.50,
      "volume": 1250000
    },
    ...
  ]
}
```

### 5. 对比分析

**提问:**
```
对比贵州茅台和五粮液的估值指标
```

**返回:**
```json
{
  "comparison": {
    "600519": {
      "name": "贵州茅台",
      "pe_ratio": 28.5,
      "pb_ratio": 7.2,
      "market_cap": 21200000000
    },
    "000858": {
      "name": "五粮液",
      "pe_ratio": 18.3,
      "pb_ratio": 4.5,
      "market_cap": 5500000000
    }
  }
}
```

## 支持的股票代码

### 上海证券交易所 (SH)
- 主板：600xxx, 601xxx, 603xxx
- 科创板：688xxx

### 深圳证券交易所 (SZ)
- 主板：000xxx, 001xxx
- 中小板：002xxx
- 创业板：300xxx, 301xxx

## 可用的数据字段

### 基础字段
- symbol: 股票代码
- name: 股票名称
- exchange: 交易所
- currency: 货币（CNY）

### 价格字段
- current_price: 当前价格
- open_price: 今开
- high_price: 最高价
- low_price: 最低价
- pre_close: 昨收

### 涨跌字段
- change: 涨跌额
- change_percent: 涨跌幅

### 成交量字段
- volume: 成交量
- amount: 成交额
- turnover_rate: 换手率

### 估值字段
- market_cap: 总市值
- pe_ratio: 市盈率
- pb_ratio: 市净率
- eps: 每股收益
- bvps: 每股净资产

### 其他字段
- high_52week: 52 周最高
- low_52week: 52 周最低
- dividend_yield: 股息率

## 常见问题

### Q: 数据是实时的吗？
A: 是的，在交易时间（9:30-11:30, 13:00-15:00）提供实时数据。

### Q: 支持港股和美股吗？
A: 不支持。港股和美股请使用 yahoo-finance MCP。

### Q: 数据更新频率？
A: 交易时间内每 3-5 秒更新一次。

### Q: 如何获取特定字段？
A: 可以在查询时指定 fields 参数，例如：
```json
{
  "ticker": "600519",
  "fields": ["symbol", "name", "current_price", "pe_ratio"]
}
```

## 高级用法

### 1. 组合查询

```
查询白酒板块所有股票的 PE 和 PB，按 PE 从低到高排序
```

### 2. 历史数据分析

```
获取贵州茅台过去一年的数据，计算月均收益率
```

### 3. 估值对比

```
对比银行板块和科技板块的平均市盈率
```

### 4. 资金流向分析

```
查询今天成交量最大的前 10 只股票
```

## 性能提示

1. **批量查询**: 使用 `get_stock_quotes` 代替多次单查
2. **字段过滤**: 只查询需要的字段，减少数据传输
3. **合理日期**: 历史数据查询不超过 1 年
4. **避免高频**: 建议间隔 1-2 秒查询

## 错误处理

### 常见错误

**股票未找到:**
```json
{
  "error": "Stock symbol '123456' not found"
}
```

**日期格式错误:**
```json
{
  "error": "Invalid date format. Use YYYY-MM-DD format."
}
```

**数据获取失败:**
```json
{
  "error": "Failed to fetch stock quote: Network error"
}
```

## 最佳实践

1. ✅ 使用正确的股票代码格式
2. ✅ 在交易时间查询实时数据
3. ✅ 批量查询时控制在 10 只以内
4. ✅ 历史数据查询不超过 5 年
5. ✅ 实现错误重试机制

## 下一步

- 查看 [README.md](./README.md) 了解更多功能
- 查看 [QUICKSTART.md](./QUICKSTART.md) 学习配置
- 查看 [MCP_COMPARISON.md](../../docs/akshare/MCP_COMPARISON.md) 对比服务

祝你使用愉快！📈
