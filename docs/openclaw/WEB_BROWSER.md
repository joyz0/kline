# Claude Code Prompt: 基于 CDP 的浏览器自动化控制系统

## 🎯 项目目标

实现一个类似 OpenClaw 的浏览器自动化控制系统，通过 Chrome DevTools Protocol (CDP) 远程控制 Chromium 系浏览器（Chrome/Brave/Edge 等）。

## 📚 核心需求

### 1. 系统架构

实现以下分层架构：

```
CLI 命令层 → Gateway RPC 层 → 浏览器控制服务 (HTTP) → CDP/Playwright → Chrome 浏览器
```

#### 技术栈要求：

- **运行时**: Node.js 22+, TypeScript (ESM)
- **浏览器控制**: Playwright + CDP (Chrome DevTools Protocol)
- **HTTP 服务器**: Express.js
- **CLI**: Commander.js + Chalk
- **配置管理**: JSON 配置文件

---

### 2. 核心功能模块

#### 模块 1: CLI 命令接口

实现以下 CLI 命令：

```bash
# 浏览器生命周期管理
kline browser start [--profile <name>]
kline browser stop [--profile <name>]
kline browser status [--profile <name>]

# 标签页管理
kline browser open <url> [--profile <name>]
kline browser tabs [--profile <name>]
kline browser focus <targetId> [--profile <name>]
kline browser close <targetId> [--profile <name>]

# 浏览器自动化
kline browser snapshot [--profile <name>] [--format ai|aria]
kline browser screenshot [--profile <name>] [--full-page]
kline browser click <ref> [--profile <name>]
kline browser type <ref> <text> [--profile <name>]
kline browser navigate <url> [--profile <name>]
```

**实现文件**: `src/cli/browser-cli.ts`, `src/cli/browser-cli-manage.ts`

**关键代码结构**：

```typescript
// CLI 命令注册
export function registerBrowserCli(program: Command) {
  const browser = program.command('browser');

  // start 命令
  browser
    .command('start')
    .option('--profile <name>', 'Browser profile name')
    .action(async (opts) => {
      await callBrowserRequest({
        method: 'POST',
        path: '/start',
        query: { profile: opts.profile },
      });
    });

  // open 命令
  browser
    .command('open')
    .argument('<url>')
    .action(async (url, opts) => {
      const tab = await callBrowserRequest({
        method: 'POST',
        path: '/tabs/open',
        body: { url },
      });
      console.log(`Opened: ${tab.url}, ID: ${tab.targetId}`);
    });
}

// Gateway 通信
async function callBrowserRequest(params: {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}) {
  // 通过 WebSocket/RPC 调用 Gateway
  const response = await gatewayRpc.call('browser.request', params);
  return response.result;
}
```

---

#### 模块 2: Gateway RPC 层

实现 Gateway 作为 WebSocket 服务器，处理浏览器控制请求：

**实现文件**: `src/gateway/server-methods/browser.ts`

**关键代码**：

```typescript
export const browserHandlers: GatewayRequestHandlers = {
  'browser.request': async ({ params, respond, context }) => {
    // 1. 验证请求参数
    const method = params.method.toUpperCase();
    const path = params.path;

    // 2. 启动浏览器控制服务
    const service = await startBrowserControlService();

    // 3. 分发到 HTTP 路由
    const result = await service.dispatch({
      method,
      path,
      query: params.query,
      body: params.body,
    });

    respond(true, result.body);
  },
};
```

---

#### 模块 3: 浏览器控制服务 (HTTP Server)

实现 Express 服务器，提供浏览器控制 HTTP API：

**实现文件**: `src/browser/server.ts`, `src/browser/control-service.ts`

**关键代码**：

```typescript
import express from 'express';
import { chromium } from 'playwright';

let browserState: {
  server: any;
  browsers: Map<string, any>; // profile -> browser instance
} | null = null;

export async function startBrowserControlService() {
  if (browserState?.server) {
    return browserState;
  }

  const app = express();
  app.use(express.json());

  // 注册路由
  registerBrowserRoutes(app);

  // 启动服务器 (端口 18791)
  const port = 18791;
  const server = app.listen(port, '127.0.0.1');

  browserState = { server, browsers: new Map() };
  return browserState;
}

function registerBrowserRoutes(app: express.Express) {
  // 基础路由
  app.post('/start', handleStart);
  app.post('/stop', handleStop);

  // 标签页路由
  app.get('/tabs', handleListTabs);
  app.post('/tabs/open', handleOpenTab);
  app.post('/tabs/focus', handleFocusTab);
  app.delete('/tabs/:targetId', handleCloseTab);

  // 自动化路由
  app.get('/snapshot', handleSnapshot);
  app.post('/screenshot', handleScreenshot);
  app.post('/act', handleAct);
}
```

---

#### 模块 4: 浏览器配置文件管理

实现多浏览器配置文件支持：

**实现文件**: `src/browser/config.ts`, `src/browser/profiles/`

**配置文件结构** (`~/.kline/kline.json`):

```json5
{
  browser: {
    enabled: true,
    defaultProfile: 'default',
    profiles: {
      default: {
        cdpPort: 18800,
        userDataDir: '~/.kline/browsers/default/user-data',
        color: '#FF4500',
        headless: false,
        extraArgs: ['--disable-gpu', '--no-sandbox'],
      },
      remote: {
        cdpUrl: 'http://192.168.1.100:9222',
        color: '#00AA00',
      },
    },
  },
}
```

**配置文件管理代码**：

```typescript
// src/browser/profiles/manager.ts
export class ProfileManager {
  private profiles: Map<string, BrowserProfile>;

  async getProfile(name: string): Promise<BrowserProfile> {
    const profile = this.profiles.get(name);
    if (!profile) {
      throw new Error(`Profile "${name}" not found`);
    }
    return profile;
  }

  async ensureBrowser(profile: BrowserProfile): Promise<Browser> {
    if (profile.cdpUrl) {
      // 远程 CDP 模式
      return await chromium.connectOverCDP(profile.cdpUrl);
    } else {
      // 本地管理模式
      return await this.launchChrome(profile);
    }
  }

  private async launchChrome(profile: BrowserProfile): Promise<Browser> {
    const args = [
      `--remote-debugging-port=${profile.cdpPort}`,
      `--user-data-dir=${profile.userDataDir}`,
      ...(profile.extraArgs || []),
    ];

    return await chromium.launch({
      args,
      headless: profile.headless,
      executablePath: profile.executablePath,
    });
  }
}
```

---

#### 模块 5: 标签页管理

实现标签页的打开、关闭、切换等操作：

**实现文件**: `src/browser/routes/tabs.ts`

**关键代码**：

```typescript
// POST /tabs/open
async function handleOpenTab(req: Request, res: Response) {
  const { url, profile = 'default' } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  const profileCtx = await getProfileContext(profile);
  await profileCtx.ensureBrowserAvailable();

  const browser = await profileCtx.getBrowser();
  const context = browser.contexts[0];

  // 创建新标签页
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  res.json({
    targetId: page.context().id,
    url: url,
    title: await page.title(),
  });
}

// GET /tabs
async function handleListTabs(req: Request, res: Response) {
  const profileCtx = await getProfileContext(req.query.profile as string);
  const tabs = await profileCtx.listTabs();

  res.json(
    tabs.map((tab) => ({
      targetId: tab.targetId,
      url: tab.url,
      title: tab.title,
    })),
  );
}
```

---

#### 模块 6: 浏览器自动化操作

实现基于 Playwright 的浏览器自动化：

**实现文件**: `src/browser/routes/agent.ts`, `src/browser/playwright-actions.ts`

**关键代码**：

```typescript
import { Page } from 'playwright';

// 点击操作
export async function clickElement(
  page: Page,
  ref: string,
  options?: {
    double?: boolean;
    button?: 'left' | 'right' | 'middle';
  },
) {
  const element = page.getByTestId(`ref-${ref}`);
  await element.click({
    clickCount: options?.double ? 2 : 1,
    button: options?.button || 'left',
  });
}

// 输入文本
export async function typeText(
  page: Page,
  ref: string,
  text: string,
  options?: {
    slowly?: boolean;
    submit?: boolean;
  },
) {
  const element = page.getByTestId(`ref-${ref}`);
  await element.fill(text, { delay: options?.slowly ? 50 : 0 });

  if (options?.submit) {
    await element.press('Enter');
  }
}

// 获取页面快照 (AI-friendly)
export async function getSnapshot(
  page: Page,
  options?: {
    format: 'ai' | 'aria';
    limit?: number;
  },
) {
  if (options?.format === 'ai') {
    // 生成带引用 ID 的可访问性树
    const snapshot = await page.locator('body').ariaSnapshot();
    return addNumericRefs(snapshot, options.limit);
  } else {
    return await page.locator('body').ariaSnapshot();
  }
}

// 截图
export async function takeScreenshot(
  page: Page,
  options?: {
    fullPage?: boolean;
    ref?: string;
    type?: 'png' | 'jpeg';
  },
) {
  if (options?.ref) {
    const element = page.getByTestId(`ref-${options.ref}`);
    return await element.screenshot({ type: options.type || 'png' });
  } else {
    return await page.screenshot({
      fullPage: options?.fullPage,
      type: options.type || 'png',
    });
  }
}
```

---

#### 模块 7: Chrome 浏览器启动与管理

实现 Chrome 浏览器的启动、停止、健康检查：

**实现文件**: `src/browser/chrome.ts`

**关键代码**：

```typescript
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function launchChrome(options: {
  cdpPort: number;
  userDataDir: string;
  executablePath?: string;
  headless?: boolean;
  extraArgs?: string[];
}): Promise<RunningChrome> {
  const args = [
    `--remote-debugging-port=${options.cdpPort}`,
    `--user-data-dir=${options.userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
  ];

  if (options.headless) {
    args.push('--headless=new');
  }

  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }

  const executable = options.executablePath || findChromeExecutable();
  const proc = spawn(executable, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  // 等待 CDP 端口可用
  await waitForCDPReady(options.cdpPort);

  return {
    pid: proc.pid!,
    exe: executable,
    userDataDir: options.userDataDir,
    cdpPort: options.cdpPort,
    startedAt: Date.now(),
    proc: proc as ChildProcessWithoutNullStreams,
  };
}

async function waitForCDPReady(
  cdpPort: number,
  timeoutMs = 10000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (res.ok) {
        return true;
      }
    } catch {
      // Ignore and retry
    }
    await sleep(100);
  }

  throw new Error(`Chrome CDP not ready on port ${cdpPort}`);
}

function findChromeExecutable(): string {
  const candidates = {
    linux: ['google-chrome', 'chromium-browser', 'chromium'],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    win32: ['chrome.exe'],
  };

  const platform = process.platform as keyof typeof candidates;
  for (const exe of candidates[platform]) {
    const path = whichSync(exe);
    if (path) {
      return path;
    }
  }

  throw new Error('Chrome executable not found');
}
```

---

#### 模块 8: CDP 通信辅助

实现 CDP 协议的底层通信：

**实现文件**: `src/browser/cdp-helpers.ts`

**关键代码**：

```typescript
import WebSocket from 'ws';

export async function fetchCdpJson(cdpUrl: string, path: string): Promise<any> {
  const url = new URL(path, cdpUrl);
  const res = await fetch(url.toString());
  return await res.json();
}

export async function connectToCDP(cdpUrl: string): Promise<WebSocket> {
  const wsUrl = await getWebSocketDebuggerUrl(cdpUrl);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

async function getWebSocketDebuggerUrl(cdpUrl: string): Promise<string> {
  const version = await fetchCdpJson(cdpUrl, '/json/version');
  return version.webSocketDebuggerUrl;
}

export function sendCDPCommand(
  ws: WebSocket,
  method: string,
  params: any = {},
): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const message = JSON.stringify({ id, method, params });

    ws.once('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.error) {
        reject(new Error(response.error.message));
      } else {
        resolve(response.result);
      }
    });

    ws.once('error', reject);
    ws.send(message);
  });
}
```

---

### 3. 错误处理与日志

实现完善的错误处理和日志系统：

```typescript
// src/browser/errors.ts
export class BrowserError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BrowserError';
  }
}

export class BrowserProfileUnavailableError extends BrowserError {
  constructor(message: string) {
    super('PROFILE_UNAVAILABLE', 503, message);
  }
}

export class BrowserTabNotFoundError extends BrowserError {
  constructor(targetId: string) {
    super('TAB_NOT_FOUND', 404, `Tab "${targetId}" not found`);
  }
}

// 日志系统
// src/browser/logger.ts
import winston from 'winston';

export const browserLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/browser-error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: 'logs/browser-combined.log' }),
  ],
});
```

---

### 4. 安全考虑

实现基本的安全防护：

```typescript
// src/browser/security/ssrf-protection.ts
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // 阻止内网地址
    if (isPrivateIP(parsed.hostname)) {
      return false;
    }

    // 只允许 http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isPrivateIP(hostname: string): boolean {
  // 检查是否为私有 IP 地址
  const ip = hostname;
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip === 'localhost' ||
    ip === '127.0.0.1'
  );
}

// src/browser/auth.ts
export function createAuthMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
  };
}
```

---

### 5. 项目结构

生成以下项目结构：

```
kline browser/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli/
│   │   ├── browser-cli.ts              # CLI 命令注册
│   │   ├── browser-cli-manage.ts       # 管理命令实现
│   │   └── browser-cli-shared.ts       # 共享工具函数
│   ├── gateway/
│   │   └── server-methods/
│   │       └── browser.ts              # Gateway RPC 处理
│   ├── browser/
│   │   ├── server.ts                   # Express 服务器
│   │   ├── control-service.ts          # 服务生命周期
│   │   ├── config.ts                   # 配置解析
│   │   ├── chrome.ts                   # Chrome 启动/管理
│   │   ├── cdp-helpers.ts              # CDP 通信辅助
│   │   ├── errors.ts                   # 错误定义
│   │   ├── logger.ts                   # 日志系统
│   │   ├── routes/
│   │   │   ├── index.ts                # 路由注册
│   │   │   ├── basic.ts                # 基础路由 (start/stop)
│   │   │   ├── tabs.ts                 # 标签页路由
│   │   │   └── agent.ts                # 自动化路由
│   │   └── profiles/
│   │       ├── manager.ts              # 配置文件管理
│   │       └── types.ts                # 类型定义
│   └── utils/
│       └── helpers.ts
```

---

### 6. 依赖配置

**package.json**:

```json
{
  "name": "kline browser",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "kline browser": "./dist/cli/browser-cli.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/gateway/server.js",
    "dev": "tsx src/gateway/server.ts",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "commander": "^12.0.0",
    "playwright": "^1.40.0",
    "ws": "^8.16.0",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.10",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.1.0"
  }
}
```

---

## 🚀 实现步骤

请按以下步骤逐步实现：

### Step 1: 项目初始化

1. 创建项目结构和 package.json
2. 配置 TypeScript (tsconfig.json)
3. 安装依赖

### Step 2: 核心基础设施

1. 实现配置加载系统 (`src/browser/config.ts`)
2. 实现日志和错误处理 (`src/browser/logger.ts`, `src/browser/errors.ts`)
3. 实现 CDP 通信辅助 (`src/browser/cdp-helpers.ts`)

### Step 3: 浏览器管理

1. 实现 Chrome 启动/停止 (`src/browser/chrome.ts`)
2. 实现配置文件管理 (`src/browser/profiles/manager.ts`)
3. 实现浏览器控制服务 (`src/browser/control-service.ts`, `src/browser/server.ts`)

### Step 4: HTTP 路由

1. 实现基础路由 (`src/browser/routes/basic.ts`)
2. 实现标签页路由 (`src/browser/routes/tabs.ts`)
3. 实现自动化路由 (`src/browser/routes/agent.ts`)

### Step 5: Gateway RPC

1. 实现 WebSocket 服务器
2. 实现 `browser.request` RPC 处理器

### Step 6: CLI 命令

1. 实现 CLI 命令注册 (`src/cli/browser-cli.ts`)
2. 实现具体命令处理器 (`src/cli/browser-cli-manage.ts`)
3. 实现 Gateway 通信 (`src/cli/browser-cli-shared.ts`)

### Step 7: 测试与优化

1. 编写单元测试
2. 集成测试
3. 性能优化

---

## 📝 代码风格要求

1. **TypeScript 严格模式**: 不使用 `any`, 明确类型定义
2. **ESM 模块**: 使用 `import/export` 语法
3. **错误处理**: 使用自定义错误类，提供清晰的错误信息
4. **日志**: 结构化日志 (JSON 格式)
5. **注释**: 关键逻辑添加简短注释
6. **文件长度**: 单个文件不超过 500 行，适时拆分

---

## ✅ 验收标准

实现完成后，以下命令应该能正常工作：

```bash
# 启动浏览器
kline browser start

# 打开网页
kline browser open https://example.com

# 查看标签页
kline browser tabs

# 获取页面快照
kline browser snapshot

# 截图
kline browser screenshot

# 点击元素
kline browser click 12

# 输入文本
kline browser type 23 "hello"
```

---

## 🔗 参考资料

- OpenClaw 浏览器控制实现：https://github.com/openclaw/openclaw
- Chrome DevTools Protocol: https://chromedevtools.github.io/devtools-protocol/
- Playwright 文档：https://playwright.dev
- Express.js 文档：https://expressjs.com
