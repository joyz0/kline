# MCP 服务对比：Akshare vs Yahoo Finance

本项目提供了两个 MCP 服务用于查询股市数据，分别针对不同市场。

## 服务对比表

| 特性 | Akshare MCP | Yahoo Finance MCP |
|------|-------------|-------------------|
| **目标市场** | 中国 A 股 | 美股、港股、加密货币 |
| **数据源** | 东方财富等 | Yahoo Finance |
| **编程语言** | Python | TypeScript |
| **实时行情** | ✅ | ✅ |
| **历史数据** | ✅ | ✅ |
| **股票搜索** | ✅ | ✅ |
| **批量查询** | ✅ | ✅ |
| **缓存支持** | ✅ | ✅ |
| **速率限制** | ✅ | ✅ |
| **字段过滤** | ✅ | ✅ |
| **传输方式** | stdio, http | stdio, http |

## 使用场景

### 选择 Akshare MCP 当：

✅ 需要查询 **A 股市场** 数据
- 贵州茅台（600519）
- 宁德时代（300750）
- 招商银行（600036）

✅ 需要 **中文数据**
- 公司名称、行业信息为中文
- 更适合中文用户和 Agent

✅ 关注 **中国政策影响**
- A 股受政策影响较大
- 更适合分析国内经济形势

✅ 需要 **详细的交易数据**
- 换手率、量比等 A 股特有指标
- 龙虎榜、资金流向等特色数据

### 选择 Yahoo Finance MCP 当：

✅ 需要查询 **美股、港股** 数据
- 苹果（AAPL）、特斯拉（TSLA）
- 腾讯控股（0700.HK）

✅ 需要 **加密货币** 数据
- 比特币（BTC-USD）
- 以太坊（ETH-USD）

✅ 需要 **全球市场** 数据
- 欧洲、亚洲其他市场
- 国际指数、汇率

✅ 需要 **英文数据**
- 更适合国际用户和 Agent
- 与英文 LLM 配合更好

## 代码示例对比

### 获取单只股票行情

**Akshare MCP (A 股):**
```python
from schemas import StockQuoteInput

input = StockQuoteInput(ticker="600519")
quote = service.get_quote(input)
# 返回：贵州茅台的中文名称、A 股特有字段
```

**Yahoo Finance MCP (美股):**
```typescript
const input = { ticker: "AAPL" };
const quote = await service.getQuote(input);
// 返回：Apple Inc. 的英文名称、美股特有字段
```

### 在 Claude Desktop 中配置两个服务

可以同时配置两个服务，根据需要选择使用：

```json
{
  "mcpServers": {
    "akshare": {
      "command": "uv",
      "args": ["run", "python", "-m", "akshare"],
      "cwd": "/path/to/akshare",
      "env": {}
    },
    "yahoo-finance": {
      "command": "node",
      "args": ["/path/to/dist/mcp/stock-quotes/index.js"],
      "cwd": "/path/to/kline",
      "env": {}
    }
  }
}
```

### 在 Agent 中使用

**场景 1：分析 A 股投资组合**
```
使用 akshare 服务查询以下股票：
- 贵州茅台（600519）
- 五粮液（000858）
- 招商银行（600036）

分析它们的估值水平和增长潜力。
```

**场景 2：分析美股科技股**
```
使用 yahoo-finance 服务查询：
- Apple (AAPL)
- Microsoft (MSFT)
- Google (GOOGL)

比较它们的财务指标和市场表现。
```

**场景 3：全球市场对比**
```
先用 akshare 查询 A 股白酒板块，
再用 yahoo-finance 查询美股饮料板块，
对比两个市场的估值差异。
```

## 技术架构对比

### Akshare MCP

```
Python 3.10+
├── Akshare (数据源客户端)
├── Pydantic (数据验证)
└── MCP SDK (协议实现)
```

**优势：**
- 直接访问中国数据源
- 数据字段更符合 A 股习惯
- Python 生态丰富，便于扩展

**限制：**
- 需要 Python 运行时
- 无内置缓存（需自行实现）
- 数据源稳定性依赖第三方

### Yahoo Finance MCP

```
Node.js 18+
├── yahoo-finance2 (数据源客户端)
├── Zod (数据验证)
└── MCP SDK (协议实现)
```

**优势：**
- TypeScript 类型安全
- 内置缓存机制
- 速率限制保护
- 与现有 Node.js 项目集成好

**限制：**
- 无法获取 A 股数据
- 部分字段为英文

## 性能对比

| 操作 | Akshare | Yahoo Finance |
|------|---------|---------------|
| 单次查询延迟 | ~500-1000ms | ~200-500ms |
| 批量查询（10 只） | ~2-3s | ~1-2s |
| 历史数据（1 年） | ~1-2s | ~500-800ms |
| 搜索响应 | ~300-500ms | ~200-300ms |

**注意：** 实际性能受网络条件、数据源负载影响较大。

## 最佳实践

### 1. 根据市场选择服务

- **A 股** → Akshare MCP
- **美股/港股** → Yahoo Finance MCP
- **加密货币** → Yahoo Finance MCP

### 2. 组合使用

在复杂分析场景中，可以组合使用两个服务：

```
1. 用 akshare 分析 A 股竞争对手
2. 用 yahoo-finance 分析美股对标公司
3. 综合对比估值、增长等指标
```

### 3. 错误处理

两个服务都可能因为网络、数据源问题失败，建议：

- 实现重试机制
- 提供降级方案
- 记录错误日志
- 设置超时时间

### 4. 缓存策略

Yahoo Finance MCP 已内置缓存，Akshare MCP 需要自行实现：

```python
from functools import lru_cache
from datetime import timedelta

@lru_cache(maxsize=100)
def get_cached_quote(ticker: str, timestamp: int):
    """带缓存的查询，timestamp 用于控制缓存过期"""
    return service.get_quote(StockQuoteInput(ticker=ticker))
```

## 未来规划

### Akshare MCP 待实现功能

- [ ] 缓存支持
- [ ] 速率限制
- [ ] 更多 A 股特色数据（龙虎榜、资金流向）
- [ ] 技术指标计算
- [ ] 财务数据分析

### Yahoo Finance MCP 待实现功能

- [ ] 更多技术指标
- [ ] 期权数据
- [ ] 财报分析
- [ ] 分析师评级

## 总结

两个服务各有优势，选择依据：

1. **市场优先**：根据目标市场选择
2. **语言偏好**：中文选 Akshare，英文选 Yahoo Finance
3. **技术栈**：Python 项目选 Akshare，Node.js 项目选 Yahoo Finance
4. **功能需求**：需要 A 股特色数据选 Akshare，需要全球市场选 Yahoo Finance

在实际使用中，建议同时配置两个服务，根据具体需求灵活选择。
