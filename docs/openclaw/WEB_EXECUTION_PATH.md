# OpenClaw Web 执行路径完整解析

## 📋 概述

OpenClaw 的 Web 访问能力（Web Fetch、Web Browser）通过一套精心设计的架构实现，支持**CLI 命令**和**LLM Agent Tool**两种使用方式，所有请求都通过**Gateway 统一分发**。

本文档完整解析从用户请求到浏览器执行的全链路流程。

---

## 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│  用户交互层                                                      │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  CLI 命令     │  │  LLM Agent   │                            │
│  │  (人类直接)  │  │  (自主调用)  │                            │
│  └──────┬───────┘  └──────┬───────┘                            │
│         │                 │                                      │
│         └────────┬────────┘                                      │
│                  │                                               │
│         ┌────────▼────────┐                                     │
│         │   Tool Registry │                                     │
│         │   (工具注册表)   │                                     │
│         └────────┬────────┘                                     │
└──────────────────│───────────────────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   Gateway Server   │
         │   (统一分发中心)    │
         │   端口：18789       │
         └─────────┬──────────┘
                   │
         ┌─────────▼──────────┐
         │ Browser Control    │
         │ Service            │
         │ 端口：18791         │
         └─────────┬──────────┘
                   │
         ┌─────────▼──────────┐
         │   Chrome Browser   │
         │   CDP 端口：18800   │
         └────────────────────┘
```

---

## 🎯 核心设计原则

### 1. **统一 Gateway 分发**
- ✅ 所有浏览器请求都通过 Gateway 转发
- ✅ 统一的认证、授权、审计
- ✅ 支持远程代理（Node Host）
- ✅ 统一的错误处理和超时控制

### 2. **LLM 自主发现工具**
- ✅ 工具通过 Schema 暴露给 LLM
- ✅ LLM 根据语义自主选择工具
- ✅ 没有硬编码的路由逻辑
- ✅ System Prompt 提供使用指导

### 3. **配置驱动**
- ✅ 工具启用/禁用由配置控制
- ✅ 工具策略（allow/deny）集中管理
- ✅ 浏览器配置文件支持多实例

### 4. **双模式支持**
- ✅ CLI 命令：人类直接操作
- ✅ Agent Tool：LLM 自主调用
- ✅ 底层共享同一套实现

---

## 📦 第一次使用：CLI 配合登录

### **为什么需要 CLI 第一次配合？**

浏览器登录态（Cookies、LocalStorage）需要**预先保存**到配置文件目录：
```
~/.openclaw/browser/<profile>/user-data/
```

### **第一次使用流程**

#### **Step 1: 启动浏览器**
```bash
openclaw browser --browser-profile openclaw start
```

**内部流程**：
```
1. CLI 解析参数
   - browserProfile: "openclaw"
   
2. 调用 runBrowserToggle(parent, { profile: "openclaw", path: "/start" })

3. callBrowserRequest() 构建请求
   - method: "POST"
   - path: "/start"
   - query: { profile: "openclaw" }

4. callGatewayFromCli("browser.request", ...)
   - 通过 WebSocket 发送到 Gateway (端口 18789)

5. Gateway 的 browserHandlers["browser.request"] 处理
   - 检查远程节点配置（无）
   - 调用 startBrowserControlServiceFromConfig()

6. 启动浏览器控制服务（Express 服务器，端口 18791）
   - POST /start 路由

7. withBasicProfileRoute() 获取 "openclaw" 配置
   - cdpPort: 18800
   - userDataDir: ~/.openclaw/browser/openclaw/user-data

8. profileCtx.ensureBrowserAvailable()
   - 检查 Chrome 是否运行（未运行）
   - 启动 Chrome: 
     google-chrome \
       --remote-debugging-port=18800 \
       --user-data-dir=~/.openclaw/browser/openclaw/user-data \
       --no-first-run \
       --no-default-browser-check

9. 等待 CDP 端口可用（轮询 /json/version）

10. 返回 { ok: true, profile: "openclaw" }
```

#### **Step 2: 打开微博并手动登录**
```bash
openclaw browser --browser-profile openclaw open https://weibo.com
```

**内部流程**：
```
1. CLI 解析参数
   - browserProfile: "openclaw"
   - url: "https://weibo.com"

2. 调用 callBrowserRequest()
   - method: "POST"
   - path: "/tabs/open"
   - body: { url: "https://weibo.com" }

3. Gateway 转发到浏览器控制服务

4. POST /tabs/open 路由处理
   - 提取 URL
   - profileCtx.ensureBrowserAvailable()（已运行，跳过）
   - profileCtx.openTab(url)

5. openTab() 实现
   - chromium.connectOverCDP("http://127.0.0.1:18800")
   - context.newPage()
   - page.goto("https://weibo.com", { waitUntil: "domcontentloaded" })

6. 返回标签页信息
   - targetId: "ABCD1234..."
   - url: "https://weibo.com"
   - title: "微博"

7. CLI 打印结果
   opened: https://weibo.com
   id: ABCD1234...
```

#### **Step 3: 手动登录**

此时浏览器窗口会打开，你**手动输入账号密码登录**。

**关键点**：
- ✅ 登录态保存到 `~/.openclaw/browser/openclaw/user-data/`
- ✅ Cookies、LocalStorage、SessionStorage 都持久化
- ✅ 下次启动自动使用保存的登录态

#### **Step 4: 关闭浏览器（可选）**
```bash
openclaw browser --browser-profile openclaw stop
```

---

## 🤖 日常使用：LLM Agent Tool 自主调用

### **用户在飞书下达指令**
```
帮我发微博："今天天气真好！#好心情#"
```

### **LLM 的完整执行流程**

#### **Phase 1: Gateway 启动时的工具注册**

**文件**: [`src/agents/openclaw-tools.ts`](file:///Users/pl/Codes/kitz/kitz-openclaw/src/agents/openclaw-tools.ts)

```typescript
export function createOpenClawTools(options?: {...}): AnyAgentTool[] {
  const tools: AnyAgentTool[] = [
    // ... 其他工具
    
    // 创建 Web Search 工具
    const webSearchTool = createWebSearchTool({
      config: options?.config,
      sandboxed: options?.sandboxed,
      runtimeWebSearch: runtimeWebTools?.search,
    });
    
    // 创建 Web Fetch 工具
    const webFetchTool = createWebFetchTool({
      config: options?.config,
      sandboxed: options?.sandboxed,
      runtimeFirecrawl: runtimeWebTools?.fetch.firecrawl,
    });
    
    // 创建 Browser 工具
    const browserTool = createBrowserTool({
      sandboxBridgeUrl: options?.sandboxBridgeUrl,
      allowHostControl: options?.allowHostBrowserControl,
      agentSessionKey: options?.agentSessionKey,
    });
    
    tools.push(webSearchTool, webFetchTool, browserTool);
    return tools;
  }
}
```

**关键点**：
- ✅ 工具在 Gateway 启动时创建
- ✅ 根据配置过滤可用工具
- ✅ 每个工具包含：name、description、parameters、execute

---

#### **Phase 2: System Prompt 生成**

**文件**: [`src/agents/tools/browser-tool.ts:307-317`](file:///Users/pl/Codes/kitz/kitz-openclaw/src/agents/tools/browser-tool.ts#L307-L317)

```typescript
export function createBrowserTool(opts?: {...}): AnyAgentTool {
  return {
    label: "Browser",
    name: "browser",
    description: [
      "Control the browser via OpenClaw's browser control server",
      "(status/start/stop/profiles/tabs/open/snapshot/screenshot/actions).",
      "Browser choice: omit profile by default for the isolated",
      "OpenClaw-managed browser (`openclaw`).",
      'For the logged-in user browser on the local host, use profile="user".',
      'When using refs from snapshot (e.g. e12), keep the same tab:',
      "prefer passing targetId from the snapshot response into",
      "subsequent actions (act/click/type/etc).",
      'For stable, self-resolving refs across calls, use snapshot',
      'with refs="aria" (Playwright aria-ref ids).',
      "Use snapshot+act for UI automation.",
      `target selects browser location (sandbox|host|node).`,
      `Default: ${targetDefault}.`,
    ].join(" "),
    parameters: BrowserToolSchema,
    execute: async (_toolCallId, args) => {
      // ... 执行逻辑
    },
  };
}
```

**System Prompt 示例**（发送给 LLM）：
```
You have access to the following tools:

### browser
Control the browser via OpenClaw's browser control server
(status/start/stop/profiles/tabs/open/snapshot/screenshot/actions).
Browser choice: omit profile by default for the isolated
OpenClaw-managed browser (`openclaw`).
For the logged-in user browser on the local host, use profile="user".
When using refs from snapshot (e.g. e12), keep the same tab:
prefer passing targetId from the snapshot response into
subsequent actions (act/click/type/etc).
For stable, self-resolving refs across calls, use snapshot
with refs="aria" (Playwright aria-ref ids).
Use snapshot+act for UI automation.
target selects browser location (sandbox|host|node).
Default: host.

### web_fetch
Fetch a URL and extract readable content (HTML to markdown).
Use this when you need to read the content of a specific webpage.

### web_search
Search the web using Brave Search API.
Use this when you need to find recent information or news.
```

---

#### **Phase 3: LLM 自主选择工具**

**LLM 的思考过程**：
```
用户请求：帮我发微博："今天天气真好！#好心情#"

分析：
1. 需要访问微博（需要登录）
2. 需要交互操作（输入、点击）
3. 查看可用工具：
   - browser: "Control the browser... snapshot/act/click/type" ✓
   - web_fetch: "Fetch a URL" ✗ 不能交互
   - web_search: "Search the web" ✗ 不相关
4. 决策：使用 browser tool

生成 Tool Call:
{
  "name": "browser",
  "arguments": {
    "action": "status",
    "target": "host"
  }
}
```

---

#### **Phase 4: Gateway 执行 Tool Call**

**文件**: [`src/agents/tools/browser-tool.ts:319-680`](file:///Users/pl/Codes/kitz/kitz-openclaw/src/agents/tools/browser-tool.ts#L319-L680)

```typescript
execute: async (_toolCallId, args) => {
  const params = args as Record<string, unknown>;
  const action = readStringParam(params, "action", { required: true });
  const profile = readStringParam(params, "profile");
  const requestedNode = readStringParam(params, "node");
  let target = readStringParam(params, "target") as "sandbox" | "host" | "node" | undefined;
  
  // 1. 解析参数
  // action: "status"
  // target: "host"
  
  // 2. 检查是否有远程节点（Node Host）
  const nodeTarget = await resolveBrowserNodeTarget({
    requestedNode,
    target,
    sandboxBridgeUrl: opts?.sandboxBridgeUrl,
  });
  
  // 3. 确定 baseUrl 或 proxy
  const baseUrl = nodeTarget
    ? undefined
    : resolveBrowserBaseUrl({
        target,
        sandboxBridgeUrl: opts?.sandboxBridgeUrl,
        allowHostControl: opts?.allowHostControl,
      });
  
  // 4. 根据 action 执行不同逻辑
  switch (action) {
    case "status":
      if (proxyRequest) {
        return jsonResult(await proxyRequest({
          method: "GET",
          path: "/",
          profile,
        }));
      }
      return jsonResult(await browserStatus(baseUrl, { profile }));
      
    case "start":
      // ... 启动浏览器
      
    case "open":
      // ... 打开 URL
      
    case "snapshot":
      // ... 获取页面快照
      
    case "act":
      // ... 执行交互操作
  }
}
```

---

#### **Phase 5: 完整的微博发帖流程**

**LLM 的多次 Tool Call 迭代**：

##### **Iteration 1: 检查浏览器状态**
```json
{
  "name": "browser",
  "arguments": {
    "action": "status",
    "target": "host"
  }
}
```

**Gateway 执行**：
```typescript
// browser-tool.ts:385-395
case "status":
  return jsonResult(await browserStatus(baseUrl, { profile }));
```

**返回结果**：
```json
{
  "running": true,
  "profile": "openclaw",
  "cdpPort": 18800
}
```

---

##### **Iteration 2: 打开微博**
```json
{
  "name": "browser",
  "arguments": {
    "action": "open",
    "url": "https://weibo.com",
    "target": "host"
  }
}
```

**Gateway 执行**：
```typescript
// browser-tool.ts:396-408
case "open":
  const url = readStringParam(params, "url");
  if (proxyRequest) {
    return jsonResult(await proxyRequest({
      method: "POST",
      path: "/tabs/open",
      body: { url },
      profile,
    }));
  }
  return jsonResult(await browserOpenTab(baseUrl, url, { profile }));
```

**浏览器控制服务执行**（`POST /tabs/open`）：
```typescript
// src/browser/routes/tabs.ts:119-136
app.post("/tabs/open", async (req, res) => {
  const url = req.body.url;
  await profileCtx.ensureBrowserAvailable();  // 已运行，跳过
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  res.json({
    targetId: page.context().id,
    url: url,
    title: await page.title(),
  });
});
```

**返回结果**：
```json
{
  "targetId": "ABCD1234...",
  "url": "https://weibo.com",
  "title": "微博"
}
```

---

##### **Iteration 3: 获取页面快照**
```json
{
  "name": "browser",
  "arguments": {
    "action": "snapshot",
    "targetId": "ABCD1234...",
    "interactive": true,
    "refs": "aria"
  }
}
```

**Gateway 执行**：
```typescript
// browser-tool.ts:438-472
case "snapshot":
  const request = readSnapshotRequestParam(params);
  return await executeSnapshotAction({
    request,
    baseUrl,
    profile,
    targetId,
    proxyRequest,
  });
```

**浏览器控制服务执行**（`GET /snapshot`）：
```typescript
// src/browser/routes/agent.ts
app.get("/snapshot", async (req, res) => {
  const page = await getPageByTargetId(targetId);
  
  // 获取 ARIA 快照
  const snapshot = await page.locator("body").ariaSnapshot();
  
  // 添加数字 refs
  const snapshotWithRefs = addNumericRefs(snapshot);
  
  res.json({
    targetId,
    url: page.url(),
    title: await page.title(),
    snapshot: snapshotWithRefs,
  });
});
```

**返回结果**：
```
[ref=e1] 微博输入框
[ref=e2] 发布按钮
[ref=e3] 表情按钮
[ref=e4] 图片按钮
```

---

##### **Iteration 4: 输入微博内容**
```json
{
  "name": "browser",
  "arguments": {
    "action": "act",
    "targetId": "ABCD1234...",
    "request": {
      "kind": "type",
      "ref": "e1",
      "text": "今天天气真好！#好心情#",
      "submit": false
    }
  }
}
```

**Gateway 执行**：
```typescript
// browser-tool.ts:474-512
case "act":
  const request = readActRequestParam(params);
  return await executeActAction({
    request,
    baseUrl,
    profile,
    targetId,
    proxyRequest,
  });
```

**浏览器控制服务执行**（`POST /act`）：
```typescript
// src/browser/routes/agent.ts
app.post("/act", async (req, res) => {
  const { kind, ref, text } = req.body;
  const page = await getPageByTargetId(targetId);
  
  if (kind === "type") {
    const element = page.getByTestId(`ref-${ref}`);
    await element.fill(text);
  }
  
  res.json({ ok: true });
});
```

**返回结果**：
```json
{ "ok": true }
```

---

##### **Iteration 5: 点击发布按钮**
```json
{
  "name": "browser",
  "arguments": {
    "action": "act",
    "targetId": "ABCD1234...",
    "request": {
      "kind": "click",
      "ref": "e2"
    }
  }
}
```

**Gateway 执行**：
```typescript
// browser-tool.ts:474-512
case "act":
  const request = readActRequestParam(params);
  return await executeActAction({ request, baseUrl, profile, targetId, proxyRequest });
```

**浏览器控制服务执行**：
```typescript
// src/browser/routes/agent.ts
app.post("/act", async (req, res) => {
  const { kind, ref } = req.body;
  const page = await getPageByTargetId(targetId);
  
  if (kind === "click") {
    const element = page.getByTestId(`ref-${ref}`);
    await element.click();
  }
  
  res.json({ ok: true });
});
```

**返回结果**：
```json
{ "ok": true }
```

---

##### **Iteration 6: 截图验证**
```json
{
  "name": "browser",
  "arguments": {
    "action": "screenshot",
    "targetId": "ABCD1234...",
    "fullPage": true
  }
}
```

**Gateway 执行**：
```typescript
// browser-tool.ts:514-548
case "screenshot":
  return await executeScreenshotAction({
    fullPage: readBooleanParam(params, "fullPage"),
    baseUrl,
    profile,
    targetId,
    proxyRequest,
  });
```

**浏览器控制服务执行**（`POST /screenshot`）：
```typescript
// src/browser/routes/agent.ts
app.post("/screenshot", async (req, res) => {
  const page = await getPageByTargetId(targetId);
  const screenshot = await page.screenshot({
    fullPage: req.body.fullPage,
    type: "png",
  });
  
  // 保存文件
  const filePath = saveScreenshot(screenshot);
  
  res.json({ path: filePath });
});
```

**返回结果**：
```json
{
  "path": "/tmp/openclaw-screenshot-20240115-123456.png"
}
```

---

##### **Iteration 7: 返回结果给用户**

**LLM 生成最终回复**：
```
✅ 微博已发布成功！

内容：今天天气真好！#好心情#
[附带截图]
```

---

## 🔑 关键技术点详解

### **1. Gateway 统一分发**

**文件**: [`src/gateway/server-methods/browser.ts`](file:///Users/pl/Codes/kitz/kitz-openclaw/src/gateway/server-methods/browser.ts)

```typescript
export const browserHandlers: GatewayRequestHandlers = {
  "browser.request": async ({ params, respond, context }) => {
    // 1. 验证请求参数
    const methodRaw = params.method.toUpperCase();
    const path = params.path;
    
    // 2. 检查是否配置了远程节点（Node Host）
    let nodeTarget: NodeSession | null = null;
    try {
      nodeTarget = resolveBrowserNodeTarget({
        cfg: context.config,
        nodes: context.nodeRegistry.listConnected(),
      });
    } catch (err) {
      // 未配置远程节点，继续使用本地服务
    }

    // 3. 如果有远程节点，代理请求到节点
    if (nodeTarget) {
      const res = await context.nodeRegistry.invoke({
        nodeId: nodeTarget.nodeId,
        command: "browser.proxy",
        params: {
          method: methodRaw,
          path,
          query: params.query,
          body: params.body,
          timeoutMs: params.timeoutMs,
        },
        idempotencyKey: crypto.randomUUID(),
      });
      respond(true, res.result);
      return;
    }

    // 4. 启动本地浏览器控制服务
    const ready = await startBrowserControlServiceFromConfig();
    if (!ready) {
      respond(false, undefined, errorShape(
        ErrorCodes.UNAVAILABLE,
        "browser control is disabled"
      ));
      return;
    }

    // 5. 创建路由分发器
    const dispatcher = createBrowserRouteDispatcher(
      createBrowserControlContext()
    );

    // 6. 分发到具体的 HTTP 路由处理器
    const result = await dispatcher.dispatch({
      method: methodRaw,
      path,
      query: params.query,
      body: params.body,
    });

    if (result.status >= 400) {
      respond(false, undefined, errorShape(result.status, result.body));
      return;
    }

    respond(true, result.body);
  },
};
```

**关键点**：
- ✅ 统一入口：`browser.request`
- ✅ 自动检测远程节点
- ✅ 按需启动浏览器服务
- ✅ 统一错误处理

---

### **2. 工具注册表**

**文件**: [`src/agents/openclaw-tools.ts`](file:///Users/pl/Codes/kitz/kitz-openclaw/src/agents/openclaw-tools.ts)

```typescript
export function createOpenClawTools(options?: {...}): AnyAgentTool[] {
  const tools: AnyAgentTool[] = [];
  
  // 创建工具
  const webSearchTool = createWebSearchTool({ ... });
  const webFetchTool = createWebFetchTool({ ... });
  const browserTool = createBrowserTool({ ... });
  
  // 添加到工具列表
  tools.push(webSearchTool, webFetchTool, browserTool);
  
  return tools;
}
```

**工具结构**：
```typescript
interface AnyAgentTool {
  label: string;           // 人类可读标签
  name: string;            // LLM 调用的名称
  description: string;     // LLM 看到的描述
  parameters: ZodSchema;   // 参数验证 Schema
  execute: (args: any) => Promise<any>;  // 执行函数
}
```

---

### **3. System Prompt 生成**

System Prompt 在 Gateway 启动时生成，包含：

1. **工具列表**：所有可用工具的名称和描述
2. **使用指导**：何时使用哪个工具
3. **最佳实践**：工具使用的建议和注意事项

**示例**：
```
You have access to the following tools:

### browser
Control the browser via OpenClaw's browser control server
(status/start/stop/profiles/tabs/open/snapshot/screenshot/actions).
Browser choice: omit profile by default for the isolated
OpenClaw-managed browser (`openclaw`).
For the logged-in user browser on the local host, use profile="user".
When using refs from snapshot (e.g. e12), keep the same tab:
prefer passing targetId from the snapshot response into
subsequent actions (act/click/type/etc).
For stable, self-resolving refs across calls, use snapshot
with refs="aria" (Playwright aria-ref ids).
Use snapshot+act for UI automation.
target selects browser location (sandbox|host|node).
Default: host.

### web_fetch
Fetch a URL and extract readable content (HTML to markdown).
Use this when you need to read the content of a specific webpage.

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
```

---

### **4. 浏览器控制服务**

**文件**: [`src/browser/server.ts`](file:///Users/pl/Codes/kitz/kitz-openclaw/src/browser/server.ts)

```typescript
export async function startBrowserControlServiceFromConfig(): Promise<boolean> {
  const cfg = loadConfig();
  const resolved = resolveBrowserConfig(cfg.browser, cfg);
  
  if (!resolved.enabled) {
    return false;
  }

  // 检查服务是否已在运行
  if (state?.server) {
    return true;
  }

  // 创建 Express 应用
  const app = express();
  app.use(express.json());
  installBrowserCommonMiddleware(app);
  installBrowserAuthMiddleware(app, browserAuth);

  // 注册所有浏览器路由
  const ctx = createBrowserRouteContext({
    getState: () => state,
    refreshConfigFromDisk: true,
  });
  registerBrowserRoutes(app, ctx);

  // 启动服务器（默认端口 18791 = gateway.port + 2）
  const port = resolved.controlPort;
  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(port, "127.0.0.1", () => resolve(s));
    s.once("error", reject);
  });

  // 保存状态
  state = { server, config: resolved };
  return true;
}
```

**路由注册**：
```typescript
// src/browser/routes/index.ts
export function registerBrowserRoutes(app: express.Express, ctx: BrowserRouteContext) {
  registerBrowserBasicRoutes(app, ctx);   // GET /, POST /start, POST /stop
  registerBrowserTabRoutes(app, ctx);     // GET /tabs, POST /tabs/open
  registerBrowserAgentRoutes(app, ctx);   // GET /snapshot, POST /act, POST /screenshot
}
```

---

### **5. 远程节点代理（Node Host）**

**文件**: [`src/agents/tools/browser-tool.ts:202-242`](file:///Users/pl/Codes/kitz/kitz-openclaw/src/agents/tools/browser-tool.ts#L202-L242)

```typescript
async function callBrowserProxy(params: {
  nodeId: string;
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
  profile?: string;
}): Promise<BrowserProxyResult> {
  const proxyTimeoutMs = Math.max(1, Math.floor(params.timeoutMs));
  const gatewayTimeoutMs = proxyTimeoutMs + BROWSER_PROXY_GATEWAY_TIMEOUT_SLACK_MS;
  
  // 通过 Gateway 调用远程节点
  const payload = await callGatewayTool("node.invoke", {
    timeoutMs: gatewayTimeoutMs,
  }, {
    nodeId: params.nodeId,
    command: "browser.proxy",
    params: {
      method: params.method,
      path: params.path,
      query: params.query,
      body: params.body,
      timeoutMs: proxyTimeoutMs,
      profile: params.profile,
    },
    idempotencyKey: crypto.randomUUID(),
  });
  
  const parsed = payload?.payload ?? JSON.parse(payload?.payloadJSON);
  return parsed;
}
```

**关键点**：
- ✅ 透明的远程代理
- ✅ LLM 无需关心浏览器位置
- ✅ 自动故障转移
- ✅ 统一的调用接口

---

## 📊 完整执行路径总结

### **路径 1: CLI 命令**

```
用户输入 CLI 命令
    ↓
CLI 命令解析 (src/cli/browser-cli.ts)
    ↓
callBrowserRequest() (src/cli/browser-cli-shared.ts)
    ↓
callGatewayFromCli("browser.request") (src/cli/gateway-rpc.ts)
    ↓
Gateway WebSocket Server (端口 18789)
    ↓
browserHandlers["browser.request"] (src/gateway/server-methods/browser.ts)
    ↓
[可选] 路由到远程节点 (node.invoke → browser.proxy)
    ↓
[否则] 启动浏览器控制服务 (src/browser/control-service.ts)
    ↓
Express HTTP 服务器 (端口 18791)
    ↓
路由分发 (src/browser/routes/dispatcher.ts)
    ↓
具体路由处理器 (src/browser/routes/*.ts)
    ↓
浏览器配置文件上下文 (src/browser/profiles/manager.ts)
    ↓
确保浏览器可用 (ensureBrowserAvailable)
    ↓
[未运行] 启动 Chrome (src/browser/chrome.ts)
    ↓
[已运行] 连接 CDP (chromium.connectOverCDP)
    ↓
执行具体操作 (openTab/snapshot/act/etc)
    ↓
Playwright / CDP 操作
    ↓
Chrome 浏览器
    ↓
返回结果 → CLI 打印
```

---

### **路径 2: LLM Agent Tool**

```
用户在聊天中下达指令
    ↓
LLM 接收消息
    ↓
LLM 分析语义
    ↓
查看可用工具（System Prompt 中）
    ↓
自主选择工具（browser/web_fetch/web_search）
    ↓
生成 Tool Call (JSON)
    ↓
Gateway 接收 Tool Call
    ↓
工具注册表查找工具 (src/agents/openclaw-tools.ts)
    ↓
执行工具的 execute 函数
    ↓
[Browser Tool]
  → 解析参数 (action/profile/targetId)
  → 检查远程节点 (resolveBrowserNodeTarget)
  → 确定 baseUrl 或 proxy
  → switch(action) 分发
  → callBrowserRequest() / proxyRequest()
  → Gateway 转发 (browser.request)
  → [同 CLI 路径，从 Gateway WebSocket 开始]
  
[Web Fetch Tool]
  → 验证参数 (url/selector/timeoutMs)
  → Playwright 启动无头浏览器
  → page.goto(url)
  → 提取内容 (HTML/Markdown)
  → 返回结果
  
[Web Search Tool]
  → 验证参数 (query/provider)
  → 调用搜索 API (Brave/Gemini/Grok/etc)
  → 返回搜索结果
    ↓
LLM 接收工具执行结果
    ↓
LLM 生成回复
    ↓
返回给用户
```

---

## 🎯 关键设计优势

### **1. 统一 Gateway 分发**
- ✅ 单一认证点（Token/Password/Pairing）
- ✅ 统一的权限控制（tool policy）
- ✅ 完整的操作审计
- ✅ 支持远程代理（Node Host）

### **2. LLM 自主发现**
- ✅ 没有硬编码的路由逻辑
- ✅ 工具通过 Schema 自描述
- ✅ LLM 根据语义自主选择
- ✅ System Prompt 提供指导

### **3. 配置驱动**
- ✅ 工具启用/禁用由配置控制
- ✅ 工具策略（allow/deny）集中管理
- ✅ 浏览器配置文件支持多实例
- ✅ 支持远程 CDP 端点

### **4. 双模式支持**
- ✅ CLI 命令：人类直接操作
- ✅ Agent Tool：LLM 自主调用
- ✅ 底层共享同一套实现
- ✅ 统一的错误处理

### **5. 会话持久化**
- ✅ 登录态保存到配置文件目录
- ✅ Cookies/LocalStorage 持久化
- ✅ 下次启动自动使用
- ✅ 支持多配置文件隔离

---

## 🔐 安全考虑

### **1. 认证和授权**
- ✅ Gateway 统一认证（Token/Password/Pairing）
- ✅ 工具策略过滤（allow/deny）
- ✅ 浏览器控制需要显式授权（allowHostControl）
- ✅ 远程节点需要配对认证

### **2. SSRF 防护**
- ✅ URL 验证（阻止内网地址）
- ✅ 只允许 http/https 协议
- ✅ 导航守卫（navigation-guard.ts）

### **3. 文件隔离**
- ✅ 浏览器配置文件隔离（~/.openclaw/browser/<profile>/）
- ✅ 会话文件锁保护
- ✅ 临时文件自动清理

### **4. 审计日志**
- ✅ 所有工具调用记录日志
- ✅ Gateway 请求/响应日志
- ✅ 浏览器操作日志

---

## 📈 性能优化

### **1. 按需启动**
- ✅ 浏览器服务按需启动
- ✅ 空闲时自动停止
- ✅ 连接复用

### **2. 渲染进程限制**
```bash
--renderer-process-limit=2  # 限制最多 2 个渲染进程
```

### **3. 资源优化**
```bash
--disable-gpu
--disable-3d-apis
--disable-extensions
--disable-background-networking
```

### **4. 内存管理**
- ✅ 空闲会话自动清理
- ✅ 标签页定期修剪
- ✅ 渲染进程共享

---

## ✅ 总结

OpenClaw 的 Web 执行路径是一个精心设计的分层架构：

1. **用户交互层**：CLI 命令 + LLM Agent Tool
2. **工具注册层**：统一的工具注册和发现
3. **Gateway 分发层**：认证、授权、路由、审计
4. **浏览器控制层**：HTTP 服务、路由分发
5. **浏览器执行层**：CDP/Playwright、Chrome 浏览器

**关键特点**：
- ✅ 统一 Gateway 分发
- ✅ LLM 自主发现工具
- ✅ 配置驱动
- ✅ 双模式支持
- ✅ 会话持久化
- ✅ 安全可靠

这套架构使得 OpenClaw 可以：
- 轻松支持分布式部署
- 统一管理多个浏览器实例
- 提供企业级的安全和审计
- 保持 CLI 和 Agent 的一致性

**这就是 OpenClaw Web 执行的完整路径！** 🎉
