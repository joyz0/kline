# Akshare MCP 重构总结

## 重构目标

将 Akshare 的架构重构为与 Yahoo Finance MCP 一致的清晰分层架构，实现真正的解耦设计。

## 新架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent (TypeScript)                       │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/agent/tools/akshare.ts                           │   │
│  │  - Agent 工具包装层                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/mcp/akshare-service/ (TypeScript)                │   │
│  │  ├── server.ts            ← MCP Server               │   │
│  │  ├── stockQuotesService.ts ← 业务逻辑层 (Service)    │   │
│  │  ├── akshare-client.ts    ← Python API 客户端        │   │
│  │  ├── toolRegistration.ts  ← MCP 工具注册             │   │
│  │  └── zod.schema.ts        ← TypeScript 类型定义     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                   spawn() stdio
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Python Akshare Library                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  akshare/src/                                         │   │
│  │  ├── tool.py              ← 命令行工具接口           │   │
│  │  ├── core/                                            │   │
│  │  │   ├── stock_quotes_service.py ← 纯粹服务层       │   │
│  │  │   ├── akshare_client.py     ← Akshare API 封装   │   │
│  │  │   ├── schemas.py            ← Pydantic schemas   │   │
│  │  │   ├── cache.py              ← 缓存管理           │   │
│  │  │   └── errors.py             ← 错误处理           │   │
│  │  └── __main__.py                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 分层职责

#### 1. Python 端（akshare/）
**职责**：纯粹的股市数据查询库（类似 yahoo-finance2 npm 包）

- `akshare_client.py`: 封装 Akshare API，提供基础数据获取能力
- `stock_quotes_service.py`: 业务逻辑层，处理数据映射和转换
- `schemas.py`: Pydantic 数据验证
- `cache.py`: 缓存管理
- `errors.py`: 错误处理
- `tool.py`: 命令行工具接口（供 TypeScript 调用）

**特点**：
- ✅ 无 MCP 协议代码
- ✅ 纯粹的 Python 库
- ✅ 可独立测试
- ✅ 可被任何语言调用

#### 2. TypeScript 端（src/mcp/akshare-service/）
**职责**：完整的 MCP Server 实现

- `akshare-client.ts`: 通过 spawn() 调用 Python 服务
- `stockQuotesService.ts`: 业务逻辑层（缓存、字段过滤等）
- `server.ts`: MCP Server 实现
- `toolRegistration.ts`: MCP 工具注册
- `zod.schema.ts`: TypeScript 类型定义

**特点**：
- ✅ 与 Yahoo Finance MCP 结构一致
- ✅ 完整的分层架构
- ✅ 遵循 MCP 协议标准
- ✅ 可独立部署和测试

#### 3. Agent 工具层（src/agent/tools/）
**职责**：Agent 工具包装

- `akshare.ts`: 将 MCP 服务包装为 LangGraph 工具

## 代码对比

### Yahoo Finance MCP

```
src/mcp/stock-quotes/
├── server.ts                  ← MCP Server
├── stockQuotesService.ts      ← Service 层
├── yahooFinanceClient.ts      ← Yahoo Finance API 客户端
├── toolRegistration.ts        ← MCP 工具注册
├── zod.schema.ts              ← Zod 类型定义
└── transports/                ← 传输层
```

### Akshare MCP（重构后）

```
src/mcp/akshare-service/
├── server.ts                  ← MCP Server
├── stockQuotesService.ts      ← Service 层
├── akshare-client.ts          ← Python API 客户端
├── toolRegistration.ts        ← MCP 工具注册
├── zod.schema.ts              ← Zod 类型定义
└── (复用 stock-quotes 的 transports)
```

### Python Akshare Library

```
akshare/src/
├── tool.py                    ← 命令行工具接口
├── core/
│   ├── stock_quotes_service.py ← Service 层
│   ├── akshare_client.py      ← Akshare API 客户端
│   ├── schemas.py             ← Pydantic 类型定义
│   ├── cache.py               ← 缓存管理
│   └── errors.py              ← 错误处理
└── __main__.py                ← MCP Server 入口（可选）
```

## 使用方式

### 启动 Akshare MCP Server

```bash
# 开发模式
pnpm run dev:akshare-service

# 生产模式
pnpm run start:akshare-service

# HTTP 模式
pnpm run start:akshare-service -- --transport http --http-port 3001
```

### 调用 Python 服务（直接）

```bash
# 查询股票
python -m akshare.tool get_quote '{"symbol": "600519"}'

# 批量查询
python -m akshare.tool get_quotes '{"symbols": ["600519", "000001"]}'

# 搜索
python -m akshare.tool search '{"query": "茅台"}'

# 历史数据
python -m akshare.tool get_historical '{
  "symbol": "600519",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}'
```

### 在 Agent 中使用

```typescript
import { callLangGraphTool } from '@/agent/tools/langgraph-tools.js';

// 查询单只股票
const quote = await callLangGraphTool('akshare_get_stock_quote', {
  ticker: '600519',
});

// 批量查询
const quotes = await callLangGraphTool('akshare_get_stock_quotes', {
  tickers: ['600519', '000001', '300750'],
});

// 搜索股票
const results = await callLangGraphTool('akshare_search_stocks', {
  query: '茅台',
});

// 历史数据
const history = await callLangGraphTool('akshare_get_historical_data', {
  ticker: '600519',
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
});
```

## 重构优势

### 1. 清晰的职责分离

- **Python 端**：纯粹的数据源库，无 MCP 协议耦合
- **TypeScript 端**：完整的 MCP Server，负责协议适配
- **Agent 层**：统一的工具调用接口

### 2. 一致的建筑风格

- Yahoo Finance MCP 和 Akshare MCP 结构完全一致
- 易于理解和维护
- 便于添加新的数据源

### 3. 可测试性

- Python 端可独立单元测试
- TypeScript Service 层可 Mock 测试
- MCP 协议层可集成测试

### 4. 可扩展性

- 易于添加新的数据源（如港股、美股）
- 易于替换底层实现
- 支持多种调用方式（MCP、直接调用等）

### 5. 解耦设计

- Python 库独立，可被其他项目复用
- TypeScript MCP Server 可独立部署
- Agent 层无感知底层实现

## 下一步计划

1. ✅ 创建 Python 命令行工具接口
2. ⏳ 测试 Python 端功能
3. ⏳ 测试 TypeScript 端功能
4. ⏳ 集成测试
5. ⏳ 更新文档

## 总结

重构后的架构：
- ✅ Python 端：纯粹的股市查询服务（类似 yahoo-finance2）
- ✅ TypeScript 端：完整的 MCP Server（与 Yahoo Finance MCP 结构一致）
- ✅ Agent 层：统一的工具调用接口

这是一个真正解耦、清晰、可维护的设计！
