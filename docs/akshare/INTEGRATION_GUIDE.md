# Akshare MCP 集成指南

本文档说明如何在 TypeScript 的 Agent 中调用 Python 的 Akshare MCP 服务。

## 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent (TypeScript)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           LangGraph Tools Registry                    │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │  Akshare Tools (src/agent/tools/akshare.ts)  │    │   │
│  │  │  - get_stock_quote                           │    │   │
│  │  │  - get_stock_quotes                          │    │   │
│  │  │  - search_stocks                             │    │   │
│  │  │  - get_historical_data                       │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   AkshareClient (src/mcp/akshare/akshare-client.ts) │   │
│  │   - MCP Client (stdio transport)                     │   │
│  │   - JSON parsing                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                   MCP Protocol (stdio)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Python Akshare MCP Server                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  server.py (akshare/src/core/server.py)              │   │
│  │  - MCP Server                                        │   │
│  │  - Tool Registration                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  stock_quotes_service.py                             │   │
│  │  - Business Logic                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  akshare_client.py                                   │   │
│  │  - Akshare API Client                                │   │
│  │  - Cache & Rate Limiting                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Akshare Library                                     │   │
│  │  - stock_zh_a_spot_em()                              │   │
│  │  - stock_zh_a_hist()                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
kline/
├── src/
│   ├── agent/
│   │   └── tools/
│   │       ├── akshare.ts              # Akshare 工具包装器
│   │       └── langgraph-tools.ts      # 工具注册（包含 Akshare 工具）
│   └── mcp/
│       └── akshare/
│           ├── akshare-client.ts       # TypeScript MCP 客户端
│           └── index.ts                # 导出
├── akshare/
│   └── src/
│       └── core/
│           ├── server.py               # Python MCP Server
│           ├── stock_quotes_service.py # 服务层
│           ├── akshare_client.py       # Akshare API 客户端
│           ├── tool_registration.py    # 工具注册
│           └── schemas.py              # Pydantic schemas
└── package.json                        # 包含 akshare scripts
```

## 可用的工具

在 Agent 中可以使用以下 4 个 Akshare 工具：

### 1. `get_stock_quote` - 查询单只股票行情

```typescript
// 在 Agent 中调用
const quote = await callLangGraphTool('get_stock_quote', {
  ticker: '600519',  // 贵州茅台
  fields: ['current_price', 'change', 'change_percent'],
});

// 返回示例
{
  symbol: '600519',
  name: '贵州茅台',
  exchange: 'SH',
  currency: 'CNY',
  current_price: 1680.50,
  change: 15.30,
  change_percent: 0.92,
  volume: 1234567,
  amount: 2076543210.00,
  market_cap: 2100000000000.00,
  pe_ratio: 35.6,
  // ... 更多字段
}
```

### 2. `get_stock_quotes` - 批量查询多只股票

```typescript
const quotes = await callLangGraphTool('get_stock_quotes', {
  tickers: ['600519', '000001', '300750'],
  fields: ['current_price', 'change_percent'],
});

// 返回示例
[
  { symbol: '600519', name: '贵州茅台', current_price: 1680.50, ... },
  { symbol: '000001', name: '平安银行', current_price: 10.25, ... },
  { symbol: '300750', name: '宁德时代', current_price: 180.30, ... },
]
```

### 3. `search_stocks` - 搜索股票

```typescript
const results = await callLangGraphTool('search_stocks', {
  query: '茅台',  // 支持中文搜索
});

// 返回示例
[
  { symbol: '600519', name: '贵州茅台', exchange: 'SH' },
  { symbol: '600518', name: '茅台股份', exchange: 'SH' },
]
```

### 4. `get_historical_data` - 查询历史数据

```typescript
const history = await callLangGraphTool('get_historical_data', {
  ticker: '600519',
  from_date: '2024-01-01',
  to_date: '2024-12-31',
  fields: ['date', 'close', 'volume'],
});

// 返回示例
[
  { date: '2024-01-02', close: 1700.00, volume: 1000000 },
  { date: '2024-01-03', close: 1710.50, volume: 1100000 },
  // ...
]
```

## 在 Agent 中使用

### 方式 1：通过 LangGraph 工具调用

```typescript
import { callLangGraphTool } from '@/agent/tools/langgraph-tools.js';

// 查询单只股票
const quote = await callLangGraphTool('get_stock_quote', {
  ticker: '600519',
});

// 批量查询
const quotes = await callLangGraphTool('get_stock_quotes', {
  tickers: ['600519', '000001', '300750'],
});

// 搜索股票
const searchResults = await callLangGraphTool('search_stocks', {
  query: '茅台',
});

// 查询历史数据
const historicalData = await callLangGraphTool('get_historical_data', {
  ticker: '600519',
  from_date: '2024-01-01',
  to_date: '2024-12-31',
});
```

### 方式 2：直接使用 AkshareClient

```typescript
import { akshareClient } from '@/mcp/akshare/akshare-client.js';

// 查询股票
const quote = await akshareClient.getQuote('600519');

// 批量查询
const quotes = await akshareClient.getQuotes(['600519', '000001']);

// 搜索
const results = await akshareClient.search('茅台');

// 历史数据
const history = await akshareClient.getHistoricalData(
  '600519',
  '2024-01-01',
  '2024-12-31'
);
```

## 启动 Akshare MCP 服务

### 开发模式（stdio transport）

```bash
# 使用 pnpm
pnpm run dev:akshare

# 或直接使用 Python
cd akshare && uv run python -m akshare --transport stdio
```

### HTTP 模式

```bash
# 启动 HTTP 服务
pnpm run start:akshare:http

# 访问 http://localhost:8000/sse
```

### 测试示例

```bash
# 运行示例脚本
pnpm run test:akshare
```

## Python 代码规范

根据项目规范，Python 代码遵循以下规则：

### 1. `__init__.py` 位置

- ✅ `akshare/src/__init__.py` - 正确（作为 Python 包入口）
- ❌ `akshare/__init__.py` - 错误（已删除）

### 2. 导入规范

```python
# ✅ 正确：使用相对导入
from akshare_client import AkshareClient
from schemas import StockQuoteInput

# ❌ 错误：不要从 index 导入
from . import AkshareClient
```

### 3. 文件组织

```
akshare/
├── src/
│   ├── __init__.py          # 包入口，导出公共 API
│   ├── __main__.py          # 命令行入口
│   ├── index.py             # 备用入口
│   └── core/
│       ├── server.py        # MCP Server
│       ├── akshare_client.py # Akshare API 客户端
│       ├── stock_quotes_service.py # 服务层
│       ├── tool_registration.py # 工具注册
│       ├── schemas.py       # Pydantic schemas
│       ├── cache.py         # 缓存管理
│       ├── errors.py        # 自定义异常
│       └── rate_limit.py    # 速率限制
├── examples/
│   └── example.py           # 使用示例
├── tests/
│   └── test_cache_rate_limit.py
├── requirements.txt
├── pyproject.toml
└── uv.toml
```

## 与 Yahoo Finance MCP 的对比

| 特性 | Akshare MCP | Yahoo Finance MCP |
|------|-------------|-------------------|
| **目标市场** | 中国 A 股 | 美股、港股、加密货币 |
| **数据源** | 东方财富等 | Yahoo Finance |
| **编程语言** | Python | TypeScript |
| **实时行情** | ✅ | ✅ |
| **历史数据** | ✅ | ✅ |
| **股票搜索** | ✅（支持中文） | ✅ |
| **批量查询** | ✅ | ✅ |
| **缓存支持** | ✅ | ✅ |
| **速率限制** | ✅ | ✅ |
| **字段过滤** | ✅ | ✅ |
| **传输方式** | stdio, http | stdio, http |

## 最佳实践

### 1. 错误处理

```typescript
try {
  const quote = await callLangGraphTool('get_stock_quote', {
    ticker: '600519',
  });
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      // 处理股票不存在的情况
    } else if (error.message.includes('rate limit')) {
      // 处理速率限制
    } else {
      // 其他错误
    }
  }
}
```

### 2. 缓存策略

Akshare MCP 服务已经内置了缓存：
- 实时行情：5 分钟
- 搜索：30 分钟
- 历史数据：1 小时

### 3. 速率限制

Akshare MCP 服务内置速率限制：
- 默认：10 次调用/60 秒
- 可通过配置调整

### 4. 字段选择

使用 `fields` 参数可以减少返回数据量，提高性能：

```typescript
// 只返回需要的字段
const quote = await callLangGraphTool('get_stock_quote', {
  ticker: '600519',
  fields: ['current_price', 'change_percent', 'volume'],
});
```

## 故障排查

### 问题 1：无法连接到 Akshare MCP

**症状**：`Failed to connect to Akshare MCP server`

**解决方案**：
1. 确保 Python 环境已安装 akshare：`cd akshare && uv pip install -r requirements.txt`
2. 检查 Python 路径是否正确
3. 确保 akshare 目录存在

### 问题 2：工具调用超时

**症状**：工具调用长时间无响应

**解决方案**：
1. 检查 Python 进程是否在运行
2. 查看日志输出：`pnpm run dev:akshare`
3. 增加超时时间配置

### 问题 3：数据为空或格式错误

**症状**：返回空数据或解析错误

**解决方案**：
1. 检查股票代码是否正确（A 股代码为 6 位数字）
2. 检查日期格式（YYYY-MM-DD）
3. 查看 Python 端日志

## 示例代码

完整的示例请参考：
- TypeScript 示例：`src/agent/tools/akshare.ts`
- Python 示例：`akshare/examples/example.py`

## 总结

通过以上配置，TypeScript 的 Agent 可以无缝调用 Python 的 Akshare MCP 服务，实现 A 股数据的查询。整个架构采用 MCP 协议进行通信，保证了：

1. **松耦合**：TypeScript 和 Python 代码完全解耦
2. **类型安全**：TypeScript 端有完整的类型定义
3. **可扩展**：易于添加新的工具和功能
4. **标准化**：遵循 MCP 协议标准
