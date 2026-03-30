# MCP 服务限流指南

> 基于网络爬虫的 MCP 服务限流最佳实践

## 为什么需要限流？

当你构建一个基于网络爬虫（如 Akshare、Yahoo Finance）的 MCP 服务时，限流是**必不可少**的。原因如下：

### 1. 保护第三方 API 不被封禁

网络爬虫 API 通常有严格的调用频率限制：

| API 提供商    | 限制           | 后果             |
| ------------- | -------------- | ---------------- |
| Yahoo Finance | ~2000 次/小时  | 临时封禁 IP      |
| Akshare       | 不确定（动态） | 返回空数据或 403 |
| 新浪财经      | ~100 次/分钟   | IP 黑名单        |

**没有限流的后果**：

```
用户请求 → MCP Server → 并发 100 个请求 → API 检测到攻击
                                                    ↓
                                            封禁 IP (24 小时)
                                                    ↓
                                            所有用户无法使用
```

### 2. 防止恶意用户 DDoS 攻击

MCP Server 暴露给客户端（如 Claude Desktop），恶意用户可能：

- 每秒发送 1000+ 个请求
- 耗尽服务器资源（CPU、内存）
- 导致服务崩溃

### 3. 保证服务质量

限流可以：

- 公平分配资源（每个用户都能用）
- 避免单个请求阻塞所有资源
- 提供可预测的响应时间

```ts
// ❌ 只有 rateLimit (120/min)
10 个并发请求 → 同时调用 Yahoo Finance
              ↓
         Yahoo Finance 检测到并发攻击
              ↓
         返回 429 Too Many Requests
```

```ts
// ❌ 只有队列
恶意用户每秒发送 1000 个请求
          ↓
    队列无限增长，内存爆炸
          ↓
    服务器崩溃
```

两者缺一不可！ 一个对外，一个对内。

---

## 限流架构

一个健壮的 MCP 服务需要**多层限流**：

```
┌─────────────────────────────────────────────────────────┐
│  第 1 层：HTTP Rate Limit (保护 MCP Server)               │
│  - 工具：express-rate-limit (Node.js) / slowapi (Python)│
│  - 配置：120 次/分钟/IP                                  │
│  - 目的：防止 DDoS 攻击                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  第 2 层：请求队列 (串行执行)                             │
│  - 工具：Promise 队列 / 线程池                           │
│  - 配置：同时只处理 1 个请求                              │
│  - 目的：避免并发请求触发 API 限流                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  第 3 层：Token Bucket (智能限流)                        │
│  - 工具：pyrate-limiter / bucket4j                      │
│  - 配置：10 次/分钟，允许突发                            │
│  - 目的：平滑流量，充分利用 API 配额                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  第 4 层：缓存 (减少重复请求)                            │
│  - 工具：node-cache / cachetools                        │
│  - 配置：TTL 5 分钟                                      │
│  - 目的：相同请求直接返回缓存                            │
└─────────────────────────────────────────────────────────┘
```

---

## 实现案例

### 案例 1：Yahoo Finance MCP (Node.js)

#### HTTP 层限流

```typescript
// src/mcp/yahoo-finance2/transports/HttpTransportStrategy.ts
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟
  max: 120, // 每个 IP 每分钟最多 120 次
  message: {
    jsonrpc: "2.0",
    error: {
      code: -32001,
      message: "Too many requests, please try again later.",
    },
    id: null,
  },
});

app.use(limiter);
```

#### 请求队列

```typescript
// src/mcp/yahoo-finance2/yahooFinanceClient.ts
export class YahooFinanceClient {
  private static queue: Promise<void> = Promise.resolve();

  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const previous = YahooFinanceClient.queue;
    let resolveNext: () => void;
    YahooFinanceClient.queue = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });

    try {
      await previous;
      return await task();
    } finally {
      resolveNext!();
    }
  }

  async quote(symbol: string) {
    return this.enqueue(async () => await this.client.quote(symbol));
  }
}
```

---

### 案例 2：Akshare MCP (Python)

#### Token Bucket 限流

```python
# akshare/src/core/cache.py
from pyrate_limiter import Limiter, Rate, Duration

class RateLimiter:
    def __init__(self, calls: int = 10, period: int = 60):
        self.limiter = Limiter(Rate(calls, period * Duration.SECOND))

    def wait_and_acquire(self, resource: str = "default"):
        """等待并获取 token，如果限流则自动等待"""
        try:
            self.limiter.try_acquire(resource)
        except Exception:
            wait_time = self.period / self.calls
            time.sleep(wait_time)
            self.limiter.try_acquire(resource)
```

#### 使用限流器

```python
# akshare/src/core/akshare_client.py
class AkshareClient:
    def __init__(self):
        self.rate_limiter = RateLimiter(calls=10, period=60)

    def get_realtime_quote(self, symbol: str):
        # 自动等待并获取 token
        self.rate_limiter.wait_and_acquire(resource="quote")

        # 执行 API 调用
        df = akshare.stock_zh_a_spot_em()
        return df[df["代码"] == symbol].iloc[0].to_dict()
```

---

## 最佳实践

### 1. 多层防御

不要依赖单一限流机制：

- ✅ HTTP 层：防止 DDoS
- ✅ 应用层：控制并发
- ✅ API 层：遵守第三方限制

### 2. 合理配置

| 场景     | 推荐配置              |
| -------- | --------------------- |
| 开发环境 | 宽松 (1000 次/分钟)   |
| 生产环境 | 严格 (60-120 次/分钟) |
| 高频 API | 队列 + 缓存           |
| 低频 API | Token Bucket          |

### 3. 缓存策略

```python
# 不同数据设置不同 TTL
CACHE_CONFIG = {
    "quote": 300,        # 实时行情：5 分钟
    "search": 1800,      # 搜索结果：30 分钟
    "historical": 3600,  # 历史数据：1 小时
}
```

### 4. 错误处理

```typescript
// 优雅降级
try {
  const data = await api.call();
  return data;
} catch (error) {
  if (error.status === 429) {
    // 限流：返回缓存数据
    return cache.get(key);
  }
  throw error;
}
```

### 5. 监控告警

```python
# 记录限流统计
def get_stats(self):
    return {
        "total_requests": self.hits + self.misses,
        "hit_rate": f"{self.hits / (self.hits + self.misses):.2%}",
        "rate_limit_hits": self.rate_limit_hits,
    }
```

---

## 常见问题

### Q1: 限流太严格，用户体验差怎么办？

**A**: 使用 Token Bucket 算法，允许突发流量：

```python
# 平时积累 token，高峰期可以连续调用多次
limiter = Limiter(Rate(10, 60))  # 10 次/分钟
```

### Q2: 多个用户共享限流配额不公平？

**A**: 按用户 ID 限流：

```typescript
const limiter = rateLimit({
  keyGenerator: (req) => req.user.id, // 按用户限流
  max: 60,
});
```

### Q3: 如何测试限流是否生效？

**A**: 使用压力测试工具：

```bash
# 使用 ab (Apache Benchmark)
ab -n 200 -c 10 http://localhost:3000/mcp

# 观察日志中的限流警告
tail -f logs/app.log | grep "rate limit"
```

---

## 总结

| 限流层           | 工具               | 配置     | 目的     |
| ---------------- | ------------------ | -------- | -------- |
| **HTTP**         | express-rate-limit | 120/min  | 防 DDoS  |
| **队列**         | Promise Chain      | 串行     | 防并发   |
| **Token Bucket** | pyrate-limiter     | 10/min   | 平滑流量 |
| **缓存**         | TTLCache           | 5min TTL | 减少重复 |

**核心原则**：

1. 永远不要信任客户端
2. 永远不要直接调用第三方 API
3. 永远要有缓存和降级方案

限流不是限制，而是保护。

---

## 参考资料

- [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit)
- [PyRateLimiter](https://github.com/vutran1710/PyRateLimiter)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
