# Kline 项目架构文档

**版本**: 1.0.0  
**日期**: 2026-03-25  
**状态**: 当前架构

---

## 📋 目录

1. [项目概述](#项目概述)
2. [系统架构](#系统架构)
3. [技术栈](#技术栈)
4. [目录结构](#目录结构)
5. [核心模块](#核心模块)
6. [数据流](#数据流)
7. [部署架构](#部署架构)

---

## 项目概述

### 项目名称

**Kline** - 股市风向日历

### 产品定位

基于因果推导的智能股市分析系统，通过 LangGraph Agent 实现从新闻事件到股票推荐的完整因果链推导。

### 核心价值

- ✅ 基于因果链推导，而非简单新闻匹配
- ✅ 支持自我学习和持续优化
- ✅ 实时分析进度推送
- ✅ 可追溯、可审计的分析过程

---

## 系统架构

### 四层架构

```
┌─────────────────────────────────────────────────────────┐
│              交互层 (Interaction Layer)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Web 前端    │  │  REST API   │  │  WebSocket 推送  │ │
│  │  React 日历  │  │  任务提交   │  │  实时进度       │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│               网关层 (Gateway Layer)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ 任务编排器  │  │  分析队列   │  │   结果缓存      │ │
│  │ Task Orch.  │  │  Bull+Redis │  │   Redis Cache   │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│             智能体层 (Agent Layer) ⭐                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │        LangGraph 状态图 (Causal Graph)            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ 新闻采集 │ → │ 事件提取 │ → │  因果链推导    │  │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ 行业分析 │ → │ 股票筛选 │ → │  自我学习      │  │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  技能系统   │  │  知识图谱   │  │   置信度追踪    │ │
│  │  Skills     │  │  Neo4j      │ │   Confidence    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│             执行层 (Execution Layer)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ 新闻采集器  │  │  事件提取   │  │   报告生成      │ │
│  │  News API   │  │  Event Ext. │  │   Report Gen.   │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│               数据层 (Data Layer)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Redis     │  │   Neo4j     │  │    LanceDB      │ │
│  │  缓存/队列  │  │  知识图谱   │  │   向量数据库    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 架构图说明

1. **交互层**: 提供 Web 界面和 API 接口，支持实时进度推送
2. **网关层**: 负责任务调度、队列管理、结果缓存
3. **智能体层**: 核心 AI 层，基于 LangGraph 实现因果推导和自我学习
4. **执行层**: 实际执行新闻采集、事件提取、报告生成等任务
5. **数据层**: 提供持久化存储（Redis、Neo4j、LanceDB）

---

## 技术栈

### 核心技术

| 类别         | 技术           | 版本      | 用途     |
| ------------ | -------------- | --------- | -------- |
| **Runtime**  | Node.js        | >= 18.0.0 | 运行环境 |
| **Language** | TypeScript     | ^5.6.3    | 开发语言 |
| **Module**   | NodeNext (ESM) | -         | 模块系统 |

### 框架与库

| 类别              | 技术             | 版本    | 用途             |
| ----------------- | ---------------- | ------- | ---------------- |
| **Web Framework** | Fastify          | ^4.28.1 | API 网关         |
| **Agent**         | LangGraph        | ^0.2.26 | 状态图引擎       |
| **LLM**           | LangChain Core   | ^0.3.18 | AI 框架          |
| **LLM Provider**  | LangChain OpenAI | ^0.3.14 | Qwen/OpenAI 适配 |
| **Queue**         | Bull             | ^4.16.3 | 任务队列         |
| **Cache/DB**      | Redis (ioredis)  | ^5.4.1  | 缓存/会话        |
| **Graph DB**      | Neo4j            | ^6.0.1  | 知识图谱         |
| **Vector DB**     | LanceDB          | ^0.27.1 | 向量检索         |
| **Validation**    | Zod              | ^3.23.8 | Schema 验证      |
| **Logging**       | tslog            | ^4.10.2 | 日志系统         |
| **Browser**       | Playwright       | ^1.58.2 | 浏览器自动化     |
| **Utils**         | dotenv, uuid, ws | -       | 工具库           |

### 开发工具

| 工具   | 用途                   |
| ------ | ---------------------- |
| tsx    | TypeScript 执行/热重载 |
| tsc    | TypeScript 编译        |
| eslint | 代码检查               |

---

## 目录结构

```
kline/
├── .kline/                    # 应用配置目录
│   ├── .env.example          # 环境变量示例
│   └── kline.json5           # 应用配置文件
│
├── src/                       # 源代码目录
│   ├── index.ts              # 应用入口
│   │
│   ├── agent/                # Agent Layer (LangGraph)
│   │   ├── graph/            # 状态图定义
│   │   │   ├── causal-graph.ts      # LangGraph 状态图
│   │   │   ├── state.ts             # 状态定义
│   │   │   └── nodes/               # 图节点
│   │   │       ├── news-collector.node.ts
│   │   │       ├── event-extractor.node.ts
│   │   │       ├── causal-inferrer.node.ts
│   │   │       ├── stock-screener.node.ts
│   │   │       ├── report-generator.node.ts
│   │   │       └── web-tool.node.ts
│   │   │
│   │   ├── tools/            # Agent 工具
│   │   │   ├── browser.ts           # 浏览器工具
│   │   │   ├── web-fetch.ts         # 网页抓取工具
│   │   │   ├── langgraph-tools.ts   # LangGraph 工具
│   │   │   ├── system-prompt.ts     # 系统提示词
│   │   │   └── index.ts             # 工具导出
│   │   │
│   │   └── agent-runtime.ts  # Agent 运行时
│   │
│   ├── gateway/              # Gateway Layer
│   │   ├── server.ts         # Fastify 服务器
│   │   ├── routes/           # API 路由
│   │   │   ├── analysis.route.ts    # 分析任务路由
│   │   │   ├── report.route.ts      # 报告查询路由
│   │   │   ├── basic.ts             # 基础路由
│   │   │   ├── tabs.ts              # 标签页路由
│   │   │   └── agent.ts             # Agent 路由
│   │   ├── websocket/        # WebSocket 处理
│   │   │   ├── progress-handler.ts  # 进度推送
│   │   │   └── browser-ws.ts        # 浏览器 WS
│   │   ├── server-methods/   # 服务器方法
│   │   │   └── browser.ts           # 浏览器控制方法
│   │   └── task-orchestrator.ts     # 任务编排器
│   │
│   ├── browser/              # 浏览器控制模块
│   │   ├── chrome.ts         # Chrome 启动配置
│   │   ├── config.ts         # 浏览器配置
│   │   ├── control-service.ts       # 浏览器控制服务
│   │   ├── cdp-helpers.ts           # CDP 辅助函数
│   │   ├── types.ts                 # 类型定义
│   │   ├── errors.ts                # 错误定义
│   │   ├── logger.ts                # 浏览器日志
│   │   ├── middleware/       # 中间件
│   │   │   └── timeout.ts           # 超时中间件
│   │   ├── profiles/         # 用户配置管理
│   │   │   ├── manager.ts           # 配置管理器
│   │   │   └── storage.ts           # 配置存储
│   │   ├── routes/           # 浏览器 API 路由
│   │   │   ├── basic.ts             # 基础操作
│   │   │   ├── tabs.ts              # 标签页操作
│   │   │   └── agent.ts             # Agent 操作
│   │   └── security/         # 安全模块
│   │       ├── auth.ts                # 认证
│   │       ├── ssrf-protection.ts     # SSRF 防护
│   │       └── index.ts               # 安全导出
│   │
│   ├── execution/            # Execution Layer
│   │   ├── event-extractor.ts       # 事件提取器
│   │   ├── causal-chain-inferrer.ts # 因果链推导
│   │   ├── stock-recommender.ts     # 股票推荐
│   │   └── report-generator.ts      # 报告生成
│   │
│   ├── infrastructure/       # 基础设施
│   │   ├── queue/            # 任务队列
│   │   │   ├── analysis-queue.ts    # 分析队列
│   │   │   └── redis-client.ts      # Redis 客户端
│   │   ├── cache/            # 缓存
│   │   │   └── result-cache.ts      # 结果缓存
│   │   └── outbound/         # 外部 API 适配
│   │       └── news-api-adapter.ts  # 新闻 API 适配器
│   │
│   ├── config/               # 配置模块
│   │   ├── index.ts                  # 配置导出
│   │   ├── env.ts                    # 环境变量加载
│   │   ├── env-replacer.ts           # 环境变量替换
│   │   ├── path-resolver.ts          # 路径解析
│   │   ├── config-defaults.ts        # 默认配置
│   │   ├── app-config.schema.ts      # 应用配置 Schema
│   │   └── browser-config.schema.ts  # 浏览器配置 Schema
│   │
│   ├── logging/              # 日志模块
│   │   ├── index.ts                  # 日志导出
│   │   ├── logger.ts                 # 日志器
│   │   ├── types.ts                  # 日志类型
│   │   ├── constants.ts              # 日志常量
│   │   └── utils.ts                  # 日志工具
│   │
│   ├── types/                # 类型定义
│   │   └── index.ts                  # 类型导出
│   │
│   └── cli/                  # 命令行工具
│       ├── browser-cli.ts            # 浏览器 CLI
│       └── browser-ws-client.ts      # 浏览器 WS 客户端
│
├── test/                     # 测试目录
│   └── browser/              # 浏览器测试
│       ├── test-cdp-connection.ts    # CDP 连接测试
│       ├── test-playwright-cdp.ts    # Playwright CDP 测试
│       └── test-browser-api.ts       # 浏览器 API 测试
│
├── docs/                     # 文档目录
│   ├── kline/                # Kline 项目文档
│   │   ├── PRODUCT_REQUIREMENT.md    # 产品需求
│   │   ├── ARCHITECTURE_DESIGN.md    # 架构设计
│   │   ├── BROWSER_CONTROL.md        # 浏览器控制
│   │   ├── CAUSAL_CHAIN.md           # 因果链设计
│   │   ├── VIBER_CODING.md           # 编码规范
│   │   ├── browser/                  # 浏览器相关文档
│   │   ├── legacy/                   # 遗留文档
│   │   ├── milestone/                # 里程碑
│   │   └── prompts/                  # Prompt 设计
│   └── openclaw/             # OpenClaw 项目文档
│
├── scripts/                  # 脚本目录
│   ├── browser-start.sh      # 浏览器启动脚本
│   └── dev.sh                # 开发启动脚本
│
├── .trae/                    # Trae IDE 配置
│   ├── rules/                # 开发规范
│   │   ├── git-commit.md           # Git 提交规范
│   │   ├── import-rule.md          # 导入规范
│   │   ├── node-next.md            # Node.js 模块规范
│   │   ├── programming-paradigms.md # 编程范式
│   │   ├── use-pnpm.md             # pnpm 使用规范
│   │   └── use-zod.md              # Zod 使用规范
│   └── skills/               # Trae Skills
│
├── package.json              # 项目配置
├── pnpm-lock.yaml            # pnpm 锁定文件
├── tsconfig.json             # TypeScript 配置
├── .gitignore                # Git 忽略配置
├── README.md                 # 项目说明
└── trae.md                   # Trae 配置说明
```

---

## 核心模块

### 1. Agent Layer (智能体层)

**位置**: [`src/agent/`](src/agent/)

**核心职责**:

- 基于 LangGraph 构建因果推导状态图
- 实现新闻采集、事件提取、因果链推导等节点
- 提供 Agent 运行时环境

**关键文件**:

- [`causal-graph.ts`](src/agent/graph/causal-graph.ts) - LangGraph 状态图定义
- [`state.ts`](src/agent/graph/state.ts) - 状态管理
- [`agent-runtime.ts`](src/agent/agent-runtime.ts) - Agent 运行时

**Graph 流程**:

```
START → news_collector → event_extractor → causal_inferrer
                                            ↓
      report_generator ← self_learner ← stock_screener
```

### 2. Gateway Layer (网关层)

**位置**: [`src/gateway/`](src/gateway/)

**核心职责**:

- 提供 Fastify HTTP API
- WebSocket 实时进度推送
- 任务编排和队列管理

**关键文件**:

- [`server.ts`](src/gateway/server.ts) - Fastify 服务器
- [`task-orchestrator.ts`](src/gateway/task-orchestrator.ts) - 任务编排器
- [`progress-handler.ts`](src/gateway/websocket/progress-handler.ts) - 进度推送

**API 接口**:

```
POST   /api/analyze          # 提交分析任务
GET    /api/tasks/:taskId    # 查询任务状态
DELETE /api/tasks/:taskId    # 取消任务
GET    /api/reports/:id      # 获取报告
WS     /ws/progress          # 进度推送
```

### 3. Browser Module (浏览器模块)

**位置**: [`src/browser/`](src/browser/)

**核心职责**:

- 基于 Playwright 的浏览器自动化
- CDP (Chrome DevTools Protocol) 支持
- 浏览器配置和安全管理

**关键特性**:

- 支持多标签页管理
- 用户配置持久化
- SSRF 防护
- 认证授权

**关键文件**:

- [`control-service.ts`](src/browser/control-service.ts) - 浏览器控制服务
- [`chrome.ts`](src/browser/chrome.ts) - Chrome 启动配置
- [`security/ssrf-protection.ts`](src/browser/security/ssrf-protection.ts) - SSRF 防护

### 4. Infrastructure (基础设施)

**位置**: [`src/infrastructure/`](src/infrastructure/)

**核心职责**:

- 任务队列 (Bull + Redis)
- 结果缓存 (Redis)
- 外部 API 适配

**关键文件**:

- [`analysis-queue.ts`](src/infrastructure/queue/analysis-queue.ts) - 分析队列
- [`redis-client.ts`](src/infrastructure/queue/redis-client.ts) - Redis 客户端
- [`result-cache.ts`](src/infrastructure/cache/result-cache.ts) - 结果缓存

### 5. Config Module (配置模块)

**位置**: [`src/config/`](src/config/)

**核心职责**:

- 环境变量加载和解析
- 配置 Schema 验证 (Zod)
- 默认配置管理

**关键文件**:

- [`index.ts`](src/config/index.ts) - 配置导出
- [`env.ts`](src/config/env.ts) - 环境变量加载
- [`app-config.schema.ts`](src/config/app-config.schema.ts) - 应用配置 Schema

### 6. Logging Module (日志模块)

**位置**: [`src/logging/`](src/logging/)

**核心职责**:

- 结构化日志 (tslog)
- 日志级别管理
- 日志工具函数

**关键文件**:

- [`logger.ts`](src/logging/logger.ts) - 日志器
- [`index.ts`](src/logging/index.ts) - 日志导出

---

## 数据流

### 完整分析流程

```
用户选择日期
    ↓
提交 POST /api/analyze
    ↓
生成任务 ID，入队 Bull Queue
    ↓
返回任务 ID 给前端
    ↓
WebSocket 连接订阅进度
    ↓
Bull Worker 处理任务
    ↓
调用 AgentRuntime.runAnalysis()
    ↓
┌─────────────────────────────────────┐
│  LangGraph 状态图执行               │
│                                     │
│  1. news_collector: 采集新闻        │
│  2. event_extractor: 提取事件       │
│  3. causal_inferrer: 推导因果链     │
│  4. stock_screener: 筛选股票        │
│  5. report_generator: 生成报告      │
│  6. self_learner: 自我学习          │
└─────────────────────────────────────┘
    ↓
推送进度到 WebSocket
    ↓
持久化报告到存储
    ↓
标记任务完成
    ↓
前端获取报告并展示
```

### 缓存策略

```typescript
// 缓存键：日期 + 新闻哈希
const cacheKey = `analysis:${date}:${newsHash}`;

// 缓存过期时间：7 天
await redis.setex(cacheKey, 7 * 24 * 60 * 60, report);
```

---

## 部署架构

### 环境要求

- **Node.js**: >= 18.0.0
- **Redis**: >= 6.0
- **pnpm**: >= 8.0

### 依赖服务

```
┌─────────────────────────────────────────┐
│           Kline Application             │
└─────────────────────────────────────────┘
         │              │              │
         ↓              ↓              ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    Redis    │ │    Neo4j    │ │  LanceDB    │
│  缓存/队列  │ │  知识图谱   │ │  向量检索   │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 启动流程

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .kline/.env.example .kline/.env

# 3. 启动 Redis
redis-server

# 4. 启动 Neo4j (可选，知识图谱功能)
docker run -d -p 7474:7474 -p 7687:7687 neo4j:latest

# 5. 开发模式
pnpm dev

# 6. 生产构建
pnpm build
pnpm start
```

### 环境变量

```bash
# 服务器配置
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# Neo4j 配置
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# LLM 配置
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1

# 浏览器配置
BROWSER_WS_ENDPOINT=ws://localhost:9222
```

---

## 开发阶段

### Phase 1: MVP (当前阶段) ✅

- ✅ 基础架构搭建
- ✅ LangGraph 状态图
- ✅ 基础 Skills（规则版）
- ✅ 新闻采集（模拟数据）
- ✅ 简单报告生成

### Phase 2: 知识图谱 🚧

- [ ] 部署 Neo4j
- [ ] 实现知识图谱 Repository
- [ ] 向量检索（LanceDB）
- [ ] Few-shot 学习

### Phase 3: 自我学习 📋

- [ ] 模式提取技能
- [ ] 预测验证机制
- [ ] 置信度追踪

### Phase 4: 前端与优化 📋

- [ ] React 日历界面
- [ ] 因果链可视化
- [ ] 性能优化
- [ ] 并发测试

---

## 编码规范

### 模块导入规范

- 使用 NodeNext 模块解析
- 相对导入必须包含 `.js` 扩展名
- 禁止在模块内部导入 `./index.js`

```typescript
// ✅ 正确
import { foo } from './utils.js';

// ❌ 错误
import { foo } from './index.js';
import { foo } from '.';
```

### 类型验证

使用 Zod 进行 Schema 验证：

```typescript
import { z } from 'zod';

const AnalysisRequestSchema = z.object({
  selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

### Git 提交规范

遵循 Conventional Commits：

```
feat(agent): add causal chain inference skill
fix(browser): resolve CDP connection timeout
docs(gateway): update API documentation
```

---

## 相关文档

- [产品需求文档](docs/kline/PRODUCT_REQUIREMENT.md)
- [架构设计文档](docs/kline/ARCHITECTURE_DESIGN.md)
- [浏览器控制文档](docs/kline/BROWSER_CONTROL.md)
- [因果链设计](docs/kline/CAUSAL_CHAIN.md)

---

**文档状态**: 当前架构 v1.0  
**最后更新**: 2026-03-25
