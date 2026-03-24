# CDP 浏览器控制系统使用指南

## 📚 概述

本项目实现了基于 Chrome DevTools Protocol (CDP) 的浏览器自动化控制系统，用于从财经网站抓取实时资讯数据。

## 🎯 核心功能

### 1. 浏览器生命周期管理
- 启动/停止浏览器实例
- 多配置文件支持（本地 CDP + 远程 CDP）
- 进程健康检查

### 2. 标签页管理
- 打开/关闭标签页
- 标签页切换
- 多标签页并发控制

### 3. 浏览器自动化
- 页面快照（AI-friendly 格式）
- 截图（全页/元素）
- 元素操作（点击/输入）
- 页面导航

### 4. 新闻采集
- 新浪财经自动抓取
- 东方财富自动抓取
- 数据去重和标准化

## 🚀 快速开始

### 前置要求

1. **Node.js 18+**
2. **Google Chrome** 或 **Chromium**
3. **Playwright**（已包含在依赖中）

### 安装依赖

```bash
pnpm install
```

### 安装 Playwright 浏览器

```bash
pnpm exec playwright install chromium
```

### 配置浏览器

编辑 `browser-config.json`:

```json
{
  "enabled": true,
  "defaultProfile": "default",
  "profiles": {
    "default": {
      "cdpPort": 18800,
      "userDataDir": "./data/browsers/default/user-data",
      "headless": false,
      "extraArgs": ["--disable-gpu", "--no-sandbox"],
      "color": "#FF4500"
    },
    "finance": {
      "cdpPort": 18801,
      "userDataDir": "./data/browsers/finance/user-data",
      "headless": true,
      "color": "#00AA00"
    }
  }
}
```

### 启动浏览器服务

#### 方式 1: 使用启动脚本

```bash
chmod +x scripts/browser-start.sh
./scripts/browser-start.sh
```

#### 方式 2: 使用命令行

```bash
pnpm tsx src/browser-server.ts
```

#### 方式 3: 作为现有服务的一部分

```bash
pnpm dev
```

浏览器服务会自动在端口 18791 启动。

## 💻 CLI 命令

### 浏览器管理

```bash
# 启动浏览器
node dist/cli/browser-cli.js browser start

# 启动特定配置
node dist/cli/browser-cli.js browser start --profile finance

# 停止浏览器
node dist/cli/browser-cli.js browser stop

# 查看状态
node dist/cli/browser-cli.js browser status

# 查看所有配置
node dist/cli/browser-cli.js browser profiles
```

### 标签页操作

```bash
# 打开网页
node dist/cli/browser-cli.js browser open https://finance.sina.com.cn

# 查看标签页
node dist/cli/browser-cli.js browser tabs

# 关闭标签页
node dist/cli/browser-cli.js browser close <targetId>
```

### 自动化操作

```bash
# 获取页面快照
node dist/cli/browser-cli.js browser snapshot

# 点击元素
node dist/cli/browser-cli.js browser click 12

# 输入文本
node dist/cli/browser-cli.js browser type 23 "hello"

# 导航到新页面
node dist/cli/browser-cli.js browser navigate https://example.com
```

## 📡 HTTP API

### 基础路由

#### 启动浏览器
```bash
POST http://localhost:18791/start
Content-Type: application/json

{
  "profile": "default"
}
```

#### 停止浏览器
```bash
POST http://localhost:18791/stop
Content-Type: application/json

{
  "profile": "default"
}
```

#### 查看状态
```bash
GET http://localhost:18791/status?profile=default
```

### 标签页路由

#### 打开标签页
```bash
POST http://localhost:18791/tabs/open
Content-Type: application/json

{
  "url": "https://finance.sina.com.cn",
  "profile": "default"
}
```

#### 列出标签页
```bash
GET http://localhost:18791/tabs?profile=default
```

#### 关闭标签页
```bash
DELETE http://localhost:18791/tabs/{targetId}?profile=default
```

### 自动化路由

#### 获取快照
```bash
GET http://localhost:18791/snapshot?profile=default&format=ai
```

响应示例：
```json
{
  "snapshot": "- [1] 地缘政治紧张局势升级...\n- [2] 央行宣布维持利率不变...",
  "url": "https://finance.sina.com.cn",
  "title": "新浪财经"
}
```

#### 截图
```bash
POST http://localhost:18791/screenshot
Content-Type: application/json

{
  "profile": "default",
  "fullPage": true,
  "type": "png"
}
```

#### 点击元素
```bash
POST http://localhost:18791/click
Content-Type: application/json

{
  "ref": "12",
  "profile": "default"
}
```

#### 输入文本
```bash
POST http://localhost:18791/type
Content-Type: application/json

{
  "ref": "23",
  "text": "hello",
  "submit": false
}
```

## 🔧 集成到新闻采集

### 启用浏览器采集

在 `.env` 文件中添加：

```bash
USE_BROWSER_FOR_NEWS=true
```

### 代码示例

```typescript
import { browserNewsCollector } from "./src/browser/news-collector.js";

// 采集新闻
const news = await browserNewsCollector.collectNews("2026-03-24");

console.log(`Collected ${news.length} news items`);
```

### 混合模式

可以同时使用 API 和浏览器采集：

```typescript
// 优先使用 API，失败时回退到浏览器
const news = await newsCollector.collectNews(date);

if (news.length === 0 && process.env.USE_BROWSER_FOR_NEWS === "true") {
  const browserNews = await browserNewsCollector.collectNews(date);
  news.push(...browserNews);
}
```

## 📊 架构设计

```
┌─────────────┐
│   CLI/GUI   │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│  Gateway Layer  │  ← WebSocket/RPC
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│  HTTP Server    │  ← Port 18791
│  (Express)      │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ Profile Manager │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│   Playwright    │  ← CDP Protocol
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│  Chrome Browser │
└─────────────────┘
```

## 🔐 安全考虑

### SSRF 防护

浏览器采集器默认阻止访问内网地址：

```typescript
function validateUrl(url: string): boolean {
  const parsed = new URL(url);
  
  // 阻止私有 IP
  if (isPrivateIP(parsed.hostname)) {
    return false;
  }
  
  // 只允许 http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return false;
  }
  
  return true;
}
```

### 认证机制（可选）

启用 Token 认证：

```bash
BROWSER_SERVICE_TOKEN=your-secret-token
```

在请求头中添加：

```
Authorization: Bearer your-secret-token
```

## 🐛 故障排查

### 浏览器启动失败

1. 检查 Chrome 是否安装：
   ```bash
   google-chrome --version
   ```

2. 检查端口是否被占用：
   ```bash
   lsof -i :18800
   ```

3. 查看详细日志：
   ```bash
   tail -f logs/browser-combined.log
   ```

### 页面加载超时

增加超时时间：

```typescript
await page.goto(url, {
  waitUntil: "domcontentloaded",
  timeout: 60000,  // 增加到 60 秒
});
```

### 内存泄漏

定期重启浏览器：

```bash
# 每 24 小时重启一次
0 0 * * * pkill -f "chrome.*18800" && sleep 5 && node dist/browser-server.js
```

## 📈 性能优化

### 1. 使用 Headless 模式

```json
{
  "profiles": {
    "default": {
      "headless": true
    }
  }
}
```

### 2. 限制并发标签页

```typescript
const MAX_TABS = 5;

if (browser.contexts()[0].pages().length >= MAX_TABS) {
  await oldestPage.close();
}
```

### 3. 使用页面池

```typescript
class PagePool {
  private pages: Page[] = [];
  
  async acquire(): Promise<Page> {
    if (this.pages.length === 0) {
      return await this.createPage();
    }
    return this.pages.pop()!;
  }
  
  async release(page: Page) {
    await page.goto("about:blank");
    this.pages.push(page);
  }
}
```

## 🎯 最佳实践

### 1. 错误处理

```typescript
try {
  const news = await browserNewsCollector.collectNews(date);
} catch (error) {
  logger.error({ error }, "News collection failed");
  
  // 回退到模拟数据
  return mockNews;
}
```

### 2. 重试机制

```typescript
async function fetchWithRetry(
  url: string,
  maxRetries = 3,
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}
```

### 3. 数据缓存

```typescript
const cache = new Map<string, NewsItem[]>();

async function getNews(date: string): Promise<NewsItem[]> {
  if (cache.has(date)) {
    return cache.get(date)!;
  }
  
  const news = await browserNewsCollector.collectNews(date);
  cache.set(date, news);
  
  return news;
}
```

## 📝 下一步

- [ ] 添加更多财经网站支持
- [ ] 实现智能反爬虫绕过
- [ ] 添加验证码识别
- [ ] 实现分布式浏览器集群
- [ ] 添加性能监控和告警

## 🔗 参考资料

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Playwright 文档](https://playwright.dev)
- [OpenClaw 浏览器控制](https://github.com/openclaw/openclaw)

---

**文档状态**: 初稿  
**最后更新**: 2026-03-24
