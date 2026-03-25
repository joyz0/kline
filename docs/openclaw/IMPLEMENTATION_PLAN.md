# OpenClaw Web 访问能力落地实施方案

## 📋 现状分析

### 已完成的核心架构

基于对 OpenClaw 架构文档的分析和现有代码的检查，本项目已经实现了以下核心组件：

#### 1. **浏览器控制服务** ✅
- 文件：[`src/browser/control-service.ts`](file:///Users/pl/Codes/kitz/kline/src/browser/control-service.ts)
- 功能：
  - Express 服务器（端口 18791）
  - 安全中间件（认证、速率限制、SSRF 防护）
  - 路由注册（basic、tabs、agent）
  - ProfileManager 管理多浏览器实例

#### 2. **浏览器路由处理器** ✅
- **基础路由** [`src/browser/routes/basic.ts`](file:///Users/pl/Codes/kitz/kline/src/browser/routes/basic.ts)
  - `POST /start` - 启动浏览器
  - `POST /stop` - 停止浏览器
  - `GET /status` - 获取状态
  - `GET /profiles` - 列出配置文件

- **标签页路由** [`src/browser/routes/tabs.ts`](file:///Users/pl/Codes/kitz/kline/src/browser/routes/tabs.ts)
  - `GET /tabs` - 列出标签页
  - `POST /tabs/open` - 打开 URL
  - `POST /tabs/focus` - 聚焦标签页
  - `DELETE /tabs/:targetId` - 关闭标签页

- **Agent 路由** [`src/browser/routes/agent.ts`](file:///Users/pl/Codes/kitz/kline/src/browser/routes/agent.ts)
  - `GET /snapshot` - 获取页面快照
  - `POST /screenshot` - 截图
  - `POST /click` - 点击元素
  - `POST /type` - 输入文本
  - `POST /navigate` - 导航 URL

#### 3. **Gateway 统一分发** ✅
- 文件：[`src/gateway/server-methods/browser.ts`](file:///Users/pl/Codes/kitz/kline/src/gateway/server-methods/browser.ts)
- 功能：
  - `GET /gateway/browser` - 启动服务
  - `POST /gateway/browser/request` - 统一请求入口
  - `POST /gateway/browser/stop` - 停止服务

#### 4. **CLI 命令行工具** ✅
- 文件：[`src/cli/browser-cli.ts`](file:///Users/pl/Codes/kitz/kline/src/cli/browser-cli.ts)
- 命令：
  - `browser start` - 启动浏览器
  - `browser stop` - 停止浏览器
  - `browser status` - 查看状态
  - `browser open <url>` - 打开 URL
  - `browser tabs` - 列出标签页
  - `browser snapshot` - 获取快照
  - `browser click <ref>` - 点击元素
  - `browser type <ref> <text>` - 输入文本
  - `browser navigate <url>` - 导航

#### 5. **Agent 工具集成** ✅
- **Browser Tool** [`src/agent/tools/browser.ts`](file:///Users/pl/Codes/kitz/kline/src/agent/tools/browser.ts)
  - 完整的参数 Schema 验证（Zod）
  - 所有浏览器操作的封装
  - 通过 Gateway 调用浏览器服务

- **Web Fetch Tool** [`src/agent/tools/web-fetch.ts`](file:///Users/pl/Codes/kitz/kline/src/agent/tools/web-fetch.ts)
  - Playwright 无头浏览器
  - HTML 转 Markdown
  - CSS 选择器内容提取

- **工具注册表** [`src/agent/tools/langgraph-tools.ts`](file:///Users/pl/Codes/kitz/kline/src/agent/tools/langgraph-tools.ts)
  - 工具初始化和注册
  - 工具调用接口
  - 工具定义导出（用于 System Prompt）

#### 6. **配置文件管理** ✅
- **浏览器配置 Schema** [`src/config/browser-config.schema.ts`](file:///Users/pl/Codes/kitz/kline/src/config/browser-config.schema.ts)
  - 多 Profile 支持
  - 安全配置（认证、速率限制、SSRF 防护）
  - CDP 端口和远程 CDP URL 支持

- **配置加载器** [`src/config/index.ts`](file:///Users/pl/Codes/kitz/kline/src/config/index.ts)
  - JSON5 配置文件
  - 环境变量替换
  - 默认值合并

#### 7. **Profile 管理器** ✅
- 文件：[`src/browser/profiles/manager.ts`](file:///Users/pl/Codes/kitz/kline/src/browser/profiles/manager.ts)
- 功能：
  - 多浏览器实例管理
  - Chrome 启动和连接
  - 远程 CDP 和本地 CDP 支持
  - 浏览器生命周期管理

#### 8. **安全机制** ✅
- 文件：[`src/browser/security/`](file:///Users/pl/Codes/kitz/kline/src/browser/security/)
  - `auth.ts` - 认证中间件
  - `ssrf-protection.ts` - SSRF 防护
  - `index.ts` - 速率限制、安全头

---

## 🎯 缺失的关键功能

根据 OpenClaw 架构文档，以下功能尚未完全实现：

### 1. **Gateway WebSocket 支持** ⚠️
**现状**：Gateway 使用 HTTP REST 接口
**缺失**：
- WebSocket 连接管理
- 实时双向通信
- CLI 的 WebSocket 调用支持

**影响**：
- CLI 直接调用 HTTP 而非 WebSocket
- 无法支持远程节点代理

### 2. **远程节点代理（Node Host）** ❌
**现状**：没有实现
**缺失**：
- 节点注册和发现
- 节点配对认证
- 远程 `browser.proxy` 命令
- 故障转移机制

**影响**：
- 无法分布式部署
- 无法在远程服务器运行浏览器

### 3. **System Prompt 生成** ⚠️
**现状**：工具定义已存在，但没有生成 System Prompt
**缺失**：
- System Prompt 模板
- 工具使用指南
- 最佳实践建议

**影响**：
- LLM 不知道如何正确使用工具
- 需要手动编写提示词

### 4. **浏览器配置文件持久化** ⚠️
**现状**：配置在内存中
**缺失**：
- 登录态（Cookies、LocalStorage）持久化路径配置
- 用户数据目录自动创建
- 配置文件模板

**影响**：
- 第一次使用后登录态无法保存
- 需要手动配置路径

### 5. **错误处理和重试机制** ⚠️
**现状**：基础错误处理
**缺失**：
- 连接重试
- 超时控制
- 优雅降级

### 6. **监控和日志** ⚠️
**现状**：基础日志
**缺失**：
- 操作审计日志
- 性能监控
- 错误追踪

---

## 📦 实施方案

### Phase 1: 完善核心功能（1-2 周）

#### 1.1 实现 System Prompt 生成 ✅

**文件**: `src/agent/tools/system-prompt.ts`（新建）

```typescript
/**
 * 生成 System Prompt，包含工具列表和使用指南
 */
export function generateSystemPrompt(): string {
  const tools = getToolDefinitions();
  
  return `
You have access to the following tools:

${tools.map(tool => `
### ${tool.name}
${tool.description}

Parameters:
${JSON.stringify(tool.parameters, null, 2)}
`).join('\n')}

## Tool Selection Guidelines

1. Use web_fetch for:
   - Static content
   - Known URLs
   - No login required

2. Use browser for:
   - Login required
   - Dynamic JavaScript content
   - Need interaction (click/type)
   - Need screenshots

3. Browser workflow:
   - Start browser: action="start"
   - Open URL: action="open"
   - Get snapshot: action="snapshot"
   - Interact: action="click"/"type" with refs from snapshot
   - Screenshot: action="screenshot" (optional)

## Best Practices

- Always check browser status before operations
- Use snapshot to get element refs before clicking/typing
- Keep the same tab for multi-step operations
- Close browser when done to save resources
`.trim();
}
```

**集成点**:
- 在 Agent 启动时调用
- 作为 System Message 发送给 LLM

#### 1.2 实现配置文件模板和持久化 ✅

**文件**: `src/browser/profiles/storage.ts`（新建）

```typescript
import fs from 'fs';
import path from 'path';
import { logger } from '../logging/index.js';

export class ProfileStorage {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      logger.info({ dir: this.baseDir }, 'Created profile base directory');
    }
  }

  getProfileDir(profileName: string): string {
    const profileDir = path.join(this.baseDir, profileName, 'user-data');
    
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
      logger.info({ profile: profileName, dir: profileDir }, 'Created profile directory');
    }
    
    return profileDir;
  }

  async saveCookies(profileName: string, cookies: any[]): Promise<void> {
    const filePath = path.join(this.baseDir, profileName, 'cookies.json');
    fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
  }

  async loadCookies(profileName: string): Promise<any[]> {
    const filePath = path.join(this.baseDir, profileName, 'cookies.json');
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  async clearProfile(profileName: string): Promise<void> {
    const profileDir = path.join(this.baseDir, profileName);
    
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
      logger.info({ profile: profileName }, 'Cleared profile');
    }
  }
}
```

**集成到 ProfileManager**:
```typescript
// src/browser/profiles/manager.ts
import { ProfileStorage } from './storage.js';

export class ProfileManager {
  private storage: ProfileStorage;

  constructor(profiles: BrowserProfile[]) {
    this.storage = new ProfileStorage('~/.kline/browser');
    
    for (const profile of profiles) {
      this.profiles.set(profile.name, profile);
      // 自动设置 userDataDir
      if (!profile.userDataDir) {
        profile.userDataDir = this.storage.getProfileDir(profile.name);
      }
    }
  }

  async getBrowser(profileName: string): Promise<Browser | undefined> {
    const browser = this.browsers.get(profileName);

    if (!browser) {
      // 加载保存的 Cookies
      const cookies = await this.storage.loadCookies(profileName);
      // ... 启动浏览器并恢复 Cookies
    }

    return browser;
  }
}
```

#### 1.3 增强错误处理和重试机制 ✅

**文件**: `src/browser/errors.ts`（增强）

```typescript
import { logger } from '../logging/index.js';

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number = 1000,
    public readonly maxRetries: number = 3,
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      if (!(error instanceof RetryableError)) {
        throw error;
      }

      logger.warn(
        { error: error.message, attempt, maxRetries, delay },
        'Operation failed, retrying...',
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError!;
}
```

**使用示例**:
```typescript
// src/browser/routes/tabs.ts
import { withRetry, RetryableError } from '../errors.js';

app.post('/tabs/open', async (req, res) => {
  try {
    const page = await withRetry(
      async () => {
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        return page;
      },
      { maxRetries: 3, initialDelay: 1000 }
    );

    res.json({ targetId: page.guid, url, title: await page.title() });
  } catch (error) {
    // 错误处理
  }
});
```

#### 1.4 实现超时控制 ✅

**文件**: `src/browser/middleware/timeout.ts`（新建）

```typescript
import type { Request, Response, NextFunction } from 'express';

export function createTimeoutMiddleware(defaultTimeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = req.query.timeout as string | undefined;
    const timeoutMs = timeout ? parseInt(timeout, 10) : defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // 清理
    res.on('finish', () => clearTimeout(timeoutId));
    res.on('close', () => clearTimeout(timeoutId));

    // 附加到 request 对象
    (req as any).signal = controller.signal;
    (req as any).timeoutMs = timeoutMs;

    next();
  };
}
```

---

### Phase 2: 实现 Gateway WebSocket 支持（1 周）

#### 2.1 实现 WebSocket 服务器

**文件**: `src/gateway/websocket/browser-ws.ts`（新建）

```typescript
import type { FastifyInstance } from 'fastify';
import type { FastifyRequest } from 'fastify/types/request';
import type { SocketStream } from '@fastify/websocket';
import { logger } from '../../logging/index.js';
import { dispatchBrowserRequest } from '../server-methods/browser.js';

interface WebSocketMessage {
  id: string;
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
}

interface WebSocketResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export function setupBrowserWebSocket(server: FastifyInstance) {
  server.get('/gateway/browser/ws', { websocket: true }, async (connection: SocketStream, req: FastifyRequest) => {
    const { socket } = connection;
    
    logger.info({ subsystem: 'gateway', websocket: true }, 'Browser WebSocket connection established');

    // 心跳
    const heartbeat = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    }, 30000);

    socket.on('message', async (message: Buffer) => {
      try {
        const msg: WebSocketMessage = JSON.parse(message.toString());
        
        logger.info({ msg }, 'Received browser request via WebSocket');

        const result = await dispatchBrowserRequest({
          method: msg.method,
          path: msg.path,
          query: msg.query,
          body: msg.body,
          timeoutMs: msg.timeoutMs,
        });

        const response: WebSocketResponse = {
          id: msg.id,
          success: true,
          result,
        };

        socket.send(JSON.stringify(response));
      } catch (error) {
        const response: WebSocketResponse = {
          id: (JSON.parse(message.toString()) as WebSocketMessage).id,
          success: false,
          error: {
            code: 500,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };

        socket.send(JSON.stringify(response));
      }
    });

    socket.on('close', () => {
      clearInterval(heartbeat);
      logger.info({ subsystem: 'gateway', websocket: true }, 'Browser WebSocket connection closed');
    });

    socket.on('error', (error: Error) => {
      logger.error({ error, subsystem: 'gateway', websocket: true }, 'Browser WebSocket error');
    });
  });
}
```

#### 2.2 更新 CLI 使用 WebSocket

**文件**: `src/cli/browser-cli-shared.ts`（新建）

```typescript
import WebSocket from 'ws';

export async function callBrowserRequest(params: {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<any> {
  const gatewayPort = process.env.GATEWAY_PORT || '18789';
  const wsUrl = `ws://127.0.0.1:${gatewayPort}/gateway/browser/ws`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const requestId = crypto.randomUUID();

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Request timeout'));
    }, params.timeoutMs || 30000);

    ws.on('open', () => {
      const message: any = {
        id: requestId,
        method: params.method,
        path: params.path,
      };

      if (params.query) {
        message.query = params.query;
      }

      if (params.body) {
        message.body = params.body;
      }

      if (params.timeoutMs) {
        message.timeoutMs = params.timeoutMs;
      }

      ws.send(JSON.stringify(message));
    });

    ws.on('message', (data: Buffer) => {
      clearTimeout(timeout);
      const response = JSON.parse(data.toString());

      if (response.id === requestId) {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error?.message || 'Unknown error'));
        }
        ws.close();
      }
    });

    ws.on('error', (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
```

---

### Phase 3: 实现远程节点代理（2-3 周）

#### 3.1 节点注册和发现

**文件**: `src/gateway/node-registry.ts`（新建）

```typescript
import { logger } from '../logging/index.js';

export interface NodeSession {
  nodeId: string;
  name: string;
  host: string;
  port: number;
  pairedAt: Date;
  lastSeen: Date;
  status: 'connected' | 'disconnected';
}

export class NodeRegistry {
  private nodes: Map<string, NodeSession> = new Map();

  registerNode(node: NodeSession): void {
    this.nodes.set(node.nodeId, node);
    logger.info({ nodeId: node.nodeId, name: node.name }, 'Node registered');
  }

  unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    logger.info({ nodeId }, 'Node unregistered');
  }

  getNode(nodeId: string): NodeSession | undefined {
    return this.nodes.get(nodeId);
  }

  listConnected(): NodeSession[] {
    return Array.from(this.nodes.values()).filter(
      node => node.status === 'connected'
    );
  }

  async invoke(params: {
    nodeId: string;
    command: string;
    params: any;
    timeoutMs?: number;
  }): Promise<any> {
    const node = this.getNode(params.nodeId);
    
    if (!node) {
      throw new Error(`Node ${params.nodeId} not found`);
    }

    // 通过 HTTP 调用远程节点
    const url = `http://${node.host}:${node.port}/node/invoke`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: params.command,
        params: params.params,
      }),
      signal: AbortSignal.timeout(params.timeoutMs || 30000),
    });

    if (!response.ok) {
      throw new Error(`Node invocation failed: ${response.status}`);
    }

    return await response.json();
  }
}
```

#### 3.2 节点配对认证

**文件**: `src/gateway/node-pairing.ts`（新建）

```typescript
import crypto from 'crypto';
import { logger } from '../logging/index.js';

export interface PairingRequest {
  nodeId: string;
  nodeName: string;
  pairingCode: string;
}

export interface PairingResponse {
  success: boolean;
  nodeId?: string;
  token?: string;
  error?: string;
}

export class NodePairing {
  private pendingPairings: Map<string, { code: string; expiresAt: Date }> = new Map();
  private nodeTokens: Map<string, string> = new Map();

  generatePairingCode(nodeId: string): string {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分钟

    this.pendingPairings.set(nodeId, { code, expiresAt });

    logger.info({ nodeId, code, expiresAt }, 'Generated pairing code');

    return code;
  }

  async confirmPairing(request: PairingRequest): Promise<PairingResponse> {
    const pending = this.pendingPairings.get(request.nodeId);

    if (!pending) {
      return { success: false, error: 'No pending pairing request' };
    }

    if (pending.code !== request.pairingCode) {
      return { success: false, error: 'Invalid pairing code' };
    }

    if (new Date() > pending.expiresAt) {
      this.pendingPairings.delete(request.nodeId);
      return { success: false, error: 'Pairing code expired' };
    }

    // 生成访问令牌
    const token = crypto.randomBytes(32).toString('hex');
    this.nodeTokens.set(request.nodeId, token);
    this.pendingPairings.delete(request.nodeId);

    logger.info({ nodeId: request.nodeId }, 'Node paired successfully');

    return {
      success: true,
      nodeId: request.nodeId,
      token,
    };
  }

  verifyToken(nodeId: string, token: string): boolean {
    const storedToken = this.nodeTokens.get(nodeId);
    return storedToken === token;
  }
}
```

#### 3.3 远程节点浏览器代理

**文件**: `src/gateway/server-methods/node-browser.ts`（新建）

```typescript
import type { FastifyInstance } from 'fastify';
import { NodeRegistry } from '../node-registry.js';
import { logger } from '../../logging/index.js';

export function registerNodeBrowserHandlers(server: FastifyInstance, nodeRegistry: NodeRegistry) {
  // 远程节点调用浏览器
  server.post('/gateway/browser/node-invoke', async (request, reply) => {
    try {
      const { nodeId, command, params } = request.body as {
        nodeId: string;
        command: string;
        params: any;
      };

      const result = await nodeRegistry.invoke({
        nodeId,
        command,
        params,
        timeoutMs: params.timeoutMs,
      });

      reply.send({ success: true, result });
    } catch (error) {
      logger.error({ error }, 'Failed to invoke remote node');

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
```

**更新 browser.ts 支持远程节点**:

```typescript
// src/gateway/server-methods/browser.ts
import { NodeRegistry } from '../node-registry.js';

export async function registerBrowserHandlers(
  server: FastifyInstance,
  nodeRegistry: NodeRegistry,
) {
  server.post('/gateway/browser/request', async (request, reply) => {
    try {
      const params = request.body as BrowserRequestParams;

      // 检查是否有远程节点
      const connectedNodes = nodeRegistry.listConnected();
      
      if (connectedNodes.length > 0) {
        // 选择第一个可用节点
        const node = connectedNodes[0];
        
        logger.info({ nodeId: node.nodeId }, 'Routing browser request to remote node');

        const result = await nodeRegistry.invoke({
          nodeId: node.nodeId,
          command: 'browser.proxy',
          params,
          timeoutMs: params.timeoutMs,
        });

        reply.send(result);
        return;
      }

      // 本地处理
      const service = await startBrowserControlService();
      const result = await dispatchBrowserRequest(service, params);

      reply.send(result);
    } catch (error) {
      // 错误处理
    }
  });
}
```

---

### Phase 4: 增强监控和日志（1 周）

#### 4.1 实现操作审计日志

**文件**: `src/logging/audit-logger.ts`（新建）

```typescript
import { logger } from './logger.js';

export interface AuditLog {
  timestamp: Date;
  action: string;
  actor: string; // 'cli' | 'agent' | 'user'
  target?: string; // profile name, url, etc.
  result: 'success' | 'failure';
  duration?: number;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  private static instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  log(params: {
    action: string;
    actor: 'cli' | 'agent' | 'user';
    target?: string;
    result: 'success' | 'failure';
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    const auditLog: AuditLog = {
      timestamp: new Date(),
      ...params,
    };

    logger.info(
      { audit: auditLog, subsystem: 'audit' },
      `Audit: ${params.action}`,
    );

    // 可选：保存到文件
    this.saveToFile(auditLog);
  }

  private saveToFile(auditLog: AuditLog): void {
    // 实现保存到文件的逻辑
  }
}

// 便捷函数
export function logBrowserAction(
  action: string,
  actor: 'cli' | 'agent' | 'user',
  target?: string,
  result: 'success' | 'failure' = 'success',
  duration?: number,
  metadata?: Record<string, any>,
): void {
  AuditLogger.getInstance().log({
    action,
    actor,
    target,
    result,
    duration,
    metadata,
  });
}
```

**集成到各个操作**:
```typescript
// src/browser/routes/tabs.ts
import { logBrowserAction } from '../logging/audit-logger.js';

app.post('/tabs/open', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // ... 打开标签页逻辑
    
    const duration = Date.now() - startTime;
    logBrowserAction('open_tab', 'cli', url, 'success', duration, { targetId });
    
    res.json({ targetId, url, title });
  } catch (error) {
    const duration = Date.now() - startTime;
    logBrowserAction('open_tab', 'cli', url, 'failure', duration, { error: error.message });
    
    // 错误处理
  }
});
```

#### 4.2 实现性能监控

**文件**: `src/logging/metrics.ts`（新建）

```typescript
export interface MetricPoint {
  timestamp: Date;
  name: string;
  value: number;
  tags?: Record<string, string>;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, MetricPoint[]> = new Map();

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  record(name: string, value: number, tags?: Record<string, string>): void {
    const point: MetricPoint = {
      timestamp: new Date(),
      name,
      value,
      tags,
    };

    let points = this.metrics.get(name);
    
    if (!points) {
      points = [];
      this.metrics.set(name, points);
    }

    points.push(point);

    // 保留最近 1 小时的数据
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    points = points.filter(p => p.timestamp > oneHourAgo);
    this.metrics.set(name, points);
  }

  getMetrics(name: string, since?: Date): MetricPoint[] {
    const points = this.metrics.get(name) || [];
    
    if (since) {
      return points.filter(p => p.timestamp > since);
    }
    
    return points;
  }

  getAverage(name: string, since?: Date): number | null {
    const points = this.getMetrics(name, since);
    
    if (points.length === 0) {
      return null;
    }

    const sum = points.reduce((acc, p) => acc + p.value, 0);
    return sum / points.length;
  }
}

// 便捷函数
export function recordBrowserAction(
  action: string,
  duration: number,
  result: 'success' | 'failure',
): void {
  MetricsCollector.getInstance().record('browser.action.duration', duration, {
    action,
    result,
  });
}
```

---

## 📝 配置文件示例

### 完整配置文件 `.kline/kline.json5`

```json5
{
  // 服务器配置
  server: {
    port: 3000,
    host: 'localhost',
  },

  // 浏览器配置
  browser: {
    enabled: true,
    defaultProfile: 'default',
    
    // 多配置文件
    profiles: {
      // 默认配置（用于 CLI 和 Agent）
      default: {
        cdpPort: 18800,
        userDataDir: './browsers/default/user-data',
        headless: false,
        extraArgs: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-extensions',
        ],
      },
      
      // 登录用户配置（保存登录态）
      user: {
        cdpPort: 18801,
        userDataDir: './browsers/user/user-data',
        headless: false,
        color: '#4285F4',
      },
      
      // 远程 CDP 配置
      remote: {
        cdpUrl: 'ws://remote-server:9222',
        headless: true,
      },
    },
    
    // 安全配置
    security: {
      authEnabled: false,
      rateLimitEnabled: true,
      rateLimitMaxRequests: 100,
      rateLimitWindowMs: 60000,
      ssrfProtectionEnabled: true,
    },
  },

  // LLM 配置
  llm: {
    provider: 'qwen',
    qwen: {
      apiKey: '${env:QWEN_API_KEY}',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
    },
  },

  // 日志配置
  logging: {
    level: 4, // 0=fatal, 1=error, 2=warn, 3=info, 4=debug, 5=trace
  },
}
```

---

## 🚀 使用指南

### CLI 使用

```bash
# 第一次使用：启动浏览器并登录
pnpm dev -- browser start --profile user
pnpm dev -- browser open https://weibo.com
# 手动登录...

# 查看状态
pnpm dev -- browser status --profile user

# 获取快照
pnpm dev -- browser snapshot --profile user --format ai

# 点击元素（ref 从 snapshot 获取）
pnpm dev -- browser click e1 --profile user

# 输入文本
pnpm dev -- browser type e2 "今天天气真好！#好心情#" --profile user --submit

# 截图
pnpm dev -- browser screenshot --profile user --output weibo.png
```

### Agent Tool 使用

```typescript
import { initializeTools, callLangGraphTool } from './src/agent/tools/index.js';

// 初始化工具
initializeTools();

// 获取 System Prompt
import { generateSystemPrompt } from './src/agent/tools/system-prompt.js';
const systemPrompt = generateSystemPrompt();

// LLM 调用工具
const result = await callLangGraphTool('browser', {
  action: 'open',
  url: 'https://weibo.com',
  profile: 'user',
});

// 获取快照
const snapshot = await callLangGraphTool('browser', {
  action: 'snapshot',
  profile: 'user',
  interactive: true,
  format: 'ai',
});

// 点击元素
await callLangGraphTool('browser', {
  action: 'click',
  ref: 'e1',
  profile: 'user',
});

// 输入文本
await callLangGraphTool('browser', {
  action: 'type',
  ref: 'e2',
  text: '今天天气真好！#好心情#',
  profile: 'user',
  submit: true,
});
```

---

## ✅ 验收标准

### Phase 1 验收
- [ ] System Prompt 正确生成并包含所有工具
- [ ] 配置文件模板存在且可用
- [ ] 登录态持久化正常工作
- [ ] 错误重试机制有效
- [ ] 超时控制正常工作

### Phase 2 验收
- [ ] WebSocket 连接建立成功
- [ ] CLI 通过 WebSocket 调用 Gateway
- [ ] 心跳机制正常工作
- [ ] 连接断开后能重连

### Phase 3 验收
- [ ] 节点注册和配对成功
- [ ] 远程节点调用浏览器成功
- [ ] 故障转移机制有效
- [ ] 分布式部署测试通过

### Phase 4 验收
- [ ] 审计日志记录完整
- [ ] 性能指标收集正常
- [ ] 监控 dashboard 可用（可选）

---

## 🔐 安全考虑

### 已实现
- ✅ SSRF 防护（URL 验证）
- ✅ 认证中间件（可选）
- ✅ 速率限制
- ✅ 安全头

### 待实现
- ⚠️ 远程节点配对认证
- ⚠️ 工具策略（allow/deny）
- ⚠️ 操作审计日志
- ⚠️ 敏感信息脱敏

---

## 📊 性能优化

### 已实现
- ✅ 浏览器服务按需启动
- ✅ 连接复用

### 待实现
- ⚠️ 空闲超时自动停止
- ⚠️ 渲染进程限制
- ⚠️ 内存管理
- ⚠️ 标签页定期修剪

---

## 🎯 总结

本项目已经实现了 OpenClaw Web 访问能力的**核心架构**，包括：
- ✅ 浏览器控制服务
- ✅ Gateway 统一分发
- ✅ CLI 命令行工具
- ✅ Agent Tool 集成
- ✅ 配置文件管理
- ✅ 安全机制

**待完成的主要功能**：
1. System Prompt 生成
2. 配置文件持久化
3. Gateway WebSocket 支持
4. 远程节点代理
5. 监控和日志

按照本方案实施，预计需要 **4-6 周** 完成所有功能。
