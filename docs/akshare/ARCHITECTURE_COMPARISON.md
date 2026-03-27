# MCP 服务架构对比

## 重构前后对比

### 重构前（❌ 耦合设计）

```
┌─────────────────────────────────────────────────────────────┐
│                Python Akshare MCP Server                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  所有内容混在一起：                                    │   │
│  │  - 业务逻辑                                           │   │
│  │  - MCP 协议适配                                        │   │
│  │  - 工具注册                                           │   │
│  │  - 缓存管理                                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                TypeScript Client                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  简单的 MCP Client 调用                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**问题**：
- ❌ Python 端耦合严重（业务逻辑 + MCP 协议）
- ❌ 难以测试（无法单独测试业务逻辑）
- ❌ 与 Yahoo Finance MCP 结构不一致
- ❌ 难以维护和扩展

### 重构后（✅ 解耦设计）

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
│  │  └── core/                                            │   │
│  │      ├── stock_quotes_service.py ← 纯粹服务层       │   │
│  │      ├── akshare_client.py     ← Akshare API 封装   │   │
│  │      ├── schemas.py            ← Pydantic schemas   │   │
│  │      ├── cache.py              ← 缓存管理           │   │
│  │      └── errors.py             ← 错误处理           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**优势**：
- ✅ 清晰的职责分离
- ✅ 与 Yahoo Finance MCP 结构一致
- ✅ 可独立测试
- ✅ 易于维护和扩展

## Yahoo Finance MCP vs Akshare MCP（重构后）

### 目录结构对比

| Yahoo Finance MCP | Akshare MCP | 说明 |
|-------------------|-------------|------|
| `src/mcp/stock-quotes/` | `src/mcp/akshare-service/` | MCP Server 目录 |
| `server.ts` | `server.ts` | MCP Server 实现 |
| `stockQuotesService.ts` | `stockQuotesService.ts` | 业务逻辑层 |
| `yahooFinanceClient.ts` | `akshare-client.ts` | API 客户端 |
| `toolRegistration.ts` | `toolRegistration.ts` | MCP 工具注册 |
| `zod.schema.ts` | `zod.schema.ts` | Zod 类型定义 |
| `errors.ts` | (复用 stock-quotes) | 错误处理 |
| `transports/` | (复用 stock-quotes) | 传输层 |

### 代码结构对比

#### Service 层对比

**Yahoo Finance:**
```typescript
export class StockQuotesService {
  private readonly yahooClient: YahooClient;
  private readonly cache: NodeCache;

  constructor(yahooClient: YahooClient) {
    this.yahooClient = yahooClient;
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
  }

  async getQuote(input: StockQuoteInput): Promise<StockQuoteResponse> {
    // 检查缓存
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) return cachedResponse;

    // 调用 Yahoo Finance API
    const result = await this.yahooClient.quote(ticker, options);
    
    // 映射响应
    const response = this.mapToStockQuoteResponse(result, ticker, fields);
    
    // 缓存结果
    this.cache.set(cacheKey, response);
    return response;
  }
}
```

**Akshare:**
```typescript
export class AkshareStockQuotesService {
  private readonly akshareClient: AkshareAPIClient;
  private readonly cache: NodeCache;

  constructor(akshareClient: AkshareAPIClient) {
    this.akshareClient = akshareClient;
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
  }

  async getQuote(input: AkshareStockQuoteInput): Promise<AkshareStockQuoteResponse> {
    // 检查缓存
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) return cachedResponse;

    // 调用 Python Akshare API
    const result = await this.akshareClient.getRealtimeQuote(ticker);
    
    // 映射响应
    const response = this.mapToStockQuoteResponse(result, ticker, fields);
    
    // 缓存结果
    this.cache.set(cacheKey, response);
    return response;
  }
}
```

**对比结果**：
- ✅ 完全一致的结构
- ✅ 相同的设计模式
- ✅ 统一的代码风格

#### Tool Registration 对比

**Yahoo Finance:**
```typescript
server.registerTool(
  'get_stock_quote',
  {
    title: 'Get Stock Quote',
    description: 'Fetch current stock quote data from Yahoo Finance...',
    inputSchema: StockQuoteSchema,
  },
  async ({ ticker, fields }) => {
    const quote = await stockService.getQuote({ ticker, fields });
    return {
      content: [{ type: 'text', text: JSON.stringify(quote) }],
      structuredContent: quote,
    };
  },
);
```

**Akshare:**
```typescript
server.registerTool(
  'akshare_get_stock_quote',
  {
    title: 'Get A-Share Stock Quote',
    description: 'Fetch current stock quote data from Akshare...',
    inputSchema: AkshareStockQuoteSchema,
  },
  async ({ ticker, fields }) => {
    const quote = await stockService.getQuote({ ticker, fields });
    return {
      content: [{ type: 'text', text: JSON.stringify(quote) }],
      structuredContent: quote,
    };
  },
);
```

**对比结果**：
- ✅ 完全一致的注册方式
- ✅ 相同的返回格式
- ✅ 统一的工具命名规范

## Python 端角色对比

### Yahoo Finance (yahoo-finance2 npm 包)

```
┌─────────────────────────────────────┐
│  yahoo-finance2 (npm package)       │
│  - 纯 JavaScript/TypeScript         │
│  - 直接调用 Yahoo Finance API       │
│  - 无 MCP 协议                       │
└─────────────────────────────────────┘
```

### Akshare (Python 库)

```
┌─────────────────────────────────────┐
│  akshare (Python library)           │
│  - 纯 Python                        │
│  - 直接调用 Akshare API             │
│  - 无 MCP 协议                       │
└─────────────────────────────────────┘
```

**对比结果**：
- ✅ 相同的角色定位（纯粹的数据源库）
- ✅ 都可以被独立使用
- ✅ 都不包含 MCP 协议代码

## 调用流程对比

### Yahoo Finance

```
Agent → LangGraph Tools → MCP Server → Service 层 → yahoo-finance2 npm 包 → Yahoo Finance API
```

### Akshare（重构后）

```
Agent → LangGraph Tools → MCP Server → Service 层 → akshare-client.ts → Python CLI → Akshare Library → Akshare API
```

**对比结果**：
- ✅ 相同的调用流程
- ✅ 相同的分层架构
- ⚠️ Akshare 多了一层 Python 调用（因为 akshare 只有 Python 版本）

## 使用方式对比

### 启动服务

```bash
# Yahoo Finance MCP
pnpm run dev:stock-quotes

# Akshare MCP
pnpm run dev:akshare-service
```

### MCP 工具名称

| Yahoo Finance | Akshare | 说明 |
|---------------|---------|------|
| `get_stock_quote` | `akshare_get_stock_quote` | 查询单只股票 |
| `get_stock_quotes` | `akshare_get_stock_quotes` | 批量查询 |
| `search_stocks` | `akshare_search_stocks` | 搜索股票 |
| `get_historical_data` | `akshare_get_historical_data` | 历史数据 |

### 在 Agent 中调用

```typescript
// Yahoo Finance
const quote = await callLangGraphTool('get_stock_quote', {
  ticker: 'AAPL',
});

// Akshare
const quote = await callLangGraphTool('akshare_get_stock_quote', {
  ticker: '600519',
});
```

## 总结

### 重构前的问题

1. ❌ Python 端耦合严重（业务逻辑 + MCP 协议）
2. ❌ 与 Yahoo Finance MCP 结构不一致
3. ❌ 难以测试和维护
4. ❌ 职责不清晰

### 重构后的优势

1. ✅ **清晰的职责分离**
   - Python：纯粹的数据源库
   - TypeScript：完整的 MCP Server
   - Agent：统一的工具调用接口

2. ✅ **一致的建筑风格**
   - 与 Yahoo Finance MCP 结构完全一致
   - 统一的代码组织和命名规范
   - 相同的设计模式

3. ✅ **可测试性**
   - Python 端可独立单元测试
   - TypeScript Service 层可 Mock 测试
   - MCP 协议层可集成测试

4. ✅ **可扩展性**
   - 易于添加新的数据源
   - 易于替换底层实现
   - 支持多种调用方式

5. ✅ **解耦设计**
   - Python 库独立，可被其他项目复用
   - TypeScript MCP Server 可独立部署
   - Agent 层无感知底层实现

### 下一步

1. ⏳ 测试 Python 端功能
2. ⏳ 测试 TypeScript 端功能
3. ⏳ 集成测试
4. ⏳ 更新文档
5. ⏳ 清理旧代码

## 结论

重构后的 Akshare MCP 架构与 Yahoo Finance MCP 完全一致，实现了真正的解耦设计：

- **Python 端**：纯粹的股市查询服务（类似 yahoo-finance2）
- **TypeScript 端**：完整的 MCP Server（与 Yahoo Finance MCP 结构一致）
- **Agent 层**：统一的工具调用接口

这是一个清晰、可维护、可扩展的设计！🎉
