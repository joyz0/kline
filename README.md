# 股市风向日历 - Kline

基于因果推导的智能股市分析系统

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- Redis >= 6.0
- pnpm >= 8.0

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的变量
```

### 启动 Redis

```bash
# macOS
brew install redis
redis-server

# 或使用 Docker
docker run -d -p 6379:6379 redis:latest
```

### 开发模式

```bash
pnpm dev
```

服务器将启动在 http://localhost:3000

### 生产构建

```bash
pnpm build
pnpm start
```

## API 接口

### 提交分析任务

```bash
POST /api/analyze
Content-Type: application/json

{
  "selectedDate": "2026-03-21"
}
```

响应：

```json
{
  "taskId": "uuid",
  "status": "PENDING",
  "message": "Analysis task created successfully"
}
```

### 查询任务状态

```bash
GET /api/tasks/:taskId
```

### 取消任务

```bash
DELETE /api/tasks/:taskId
```

### 获取分析报告

```bash
GET /api/reports/:reportId
```

### WebSocket 进度推送

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/progress?taskId=xxx');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Progress:', message);
};
```

## 项目结构

```
src/
├── agent/              # Agent Layer (LangGraph)
│   ├── graph/         # 状态图定义
│   │   └── nodes/     # 图节点
│   └── agent-runtime.ts
├── gateway/           # Gateway Layer
│   ├── routes/        # API 路由
│   ├── websocket/     # WebSocket 处理
│   └── task-orchestrator.ts
├── infrastructure/    # 基础设施
│   ├── queue/         # 任务队列
│   ├── cache/         # 缓存
│   └── outbound/      # 外部 API 适配器
├── execution/         # Execution Layer
│   ├── event-extractor.ts
│   ├── causal-chain-inferrer.ts
│   ├── stock-recommender.ts
│   └── report-generator.ts
├── config/            # 配置
├── types/             # 类型定义
└── utils/             # 工具函数
```

## 技术栈

- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify
- **Agent**: LangGraph + LangChain
- **Queue**: Bull + Redis
- **Validation**: Zod
- **Logger**: Pino

## 开发阶段

### Phase 1: MVP (当前阶段)

- ✅ 基础架构搭建
- ✅ LangGraph 状态图
- ✅ 基础 Skills（规则版）
- ✅ 新闻采集（模拟数据）
- ✅ 简单报告生成

### Phase 2: 知识图谱

- [ ] 部署 Neo4j
- [ ] 实现知识图谱 Repository
- [ ] 向量检索（LanceDB）
- [ ] Few-shot 学习

### Phase 3: 自我学习

- [ ] 模式提取技能
- [ ] 预测验证机制
- [ ] 置信度追踪

### Phase 4: 前端与优化

- [ ] React 日历界面
- [ ] 因果链可视化
- [ ] 性能优化
- [ ] 并发测试

## License

MIT
