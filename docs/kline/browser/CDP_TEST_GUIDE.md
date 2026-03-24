# CDP 浏览器控制测试指南

## 🎯 测试目标

验证通过 CDP (Chrome DevTools Protocol) 协议控制浏览器的完整流程。

## 📝 测试前准备

### 1. 环境检查清单

- [ ] Node.js 版本 >= 18
- [ ] 已安装 Chrome/Chromium 浏览器
- [ ] 已安装项目依赖 (`pnpm install`)
- [ ] 配置文件 `.kline/kline.json5` 已正确配置

### 2. 配置检查

**配置文件位置**: `.kline/kline.json5`

```json5
{
  browser: {
    enabled: true,
    defaultProfile: 'default',
    security: {
      // 测试环境建议禁用认证，方便调试
      authEnabled: false,  // 测试时设为 false
      rateLimitEnabled: false,  // 测试时禁用限流
      ssrfProtectionEnabled: true,
    },
    profiles: {
      default: {
        cdpPort: 18800,  // CDP 端口
        userDataDir: './data/browsers/default/user-data',
        headless: false,  // 测试时使用可见模式
        extraArgs: ['--disable-gpu', '--no-sandbox'],
      }
    }
  }
}
```

### 3. 设置测试环境变量（如需认证）

```bash
# .env 文件
BROWSER_API_SECRET="test-secret-key-12345"
```

---

## 🚀 测试步骤

### **Step 1: 启动浏览器服务**

#### 方式 1: 使用 CLI 命令（推荐）

```bash
# 启动默认配置的浏览器
pnpm dev

# 或在另一个终端
kline browser start --profile default
```

#### 方式 2: 直接启动浏览器（独立测试）

创建测试脚本 `test-browser-start.ts`:

```typescript
import { launchChrome } from './src/browser/chrome.js';

async function test() {
  try {
    console.log('🚀 启动 Chrome 浏览器...');
    
    const chrome = await launchChrome({
      cdpPort: 18800,
      userDataDir: './data/browsers/test/user-data',
      headless: false,
    });
    
    console.log('✅ 浏览器启动成功!');
    console.log('   PID:', chrome.pid);
    console.log('   CDP Port:', chrome.cdpPort);
    console.log('   User Data Dir:', chrome.userDataDir);
    
    // 保持进程运行
    console.log('\n按 Ctrl+C 停止浏览器');
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

test();
```

运行：
```bash
npx tsx test-browser-start.ts
```

---

### **Step 2: 验证 CDP 端口可用**

```bash
# 检查 CDP 端口是否监听
curl http://127.0.0.1:18800/json/version

# 预期输出
{
  "Browser": "Chrome/120.0.0.0",
  "Protocol-Version": "1.3",
  "User-Agent": "...",
  "V8-Version": "...",
  "WebKit-Version": "...",
  "webSocketDebuggerUrl": "ws://127.0.0.1:18800/devtools/browser/..."
}
```

**检查可用标签页**:
```bash
curl http://127.0.0.1:18800/json/list

# 预期输出（数组）
[
  {
    "description": "",
    "id": "target-id-xxx",
    "title": "New Tab",
    "type": "page",
    "url": "chrome://newtab/",
    "webSocketDebuggerUrl": "ws://..."
  }
]
```

---

### **Step 3: 测试浏览器控制服务**

#### 测试 1: 启动浏览器服务

```bash
# 启动 HTTP 控制服务
curl -X POST http://localhost:18791/start \
  -H "Content-Type: application/json" \
  -d '{"profile": "default"}'

# 预期响应
{
  "success": true,
  "message": "Browser for profile \"default\" started successfully",
  "profile": "default"
}
```

#### 测试 2: 打开网页

```bash
curl -X POST http://localhost:18791/tabs/open \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.example.com",
    "profile": "default"
  }'

# 预期响应
{
  "targetId": "page-guid-xxx",
  "url": "https://www.example.com",
  "title": "Example Domain",
  "profile": "default"
}
```

#### 测试 3: 获取页面快照

```bash
curl http://localhost:18791/snapshot?profile=default

# 预期响应
{
  "snapshot": "[1] heading \"Example Domain\"\n[2] paragraph \"This domain is for use...\"",
  "url": "https://www.example.com",
  "title": "Example Domain"
}
```

#### 测试 4: 截图

```bash
curl -X POST http://localhost:18791/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "profile": "default",
    "fullPage": true,
    "type": "png"
  }' \
  --output screenshot.png

# 检查文件是否生成
ls -lh screenshot.png
```

#### 测试 5: 元素操作

```bash
# 点击元素（需要先获取元素的 ref）
curl -X POST http://localhost:18791/click \
  -H "Content-Type: application/json" \
  -d '{
    "ref": "1",
    "profile": "default"
  }'

# 输入文本
curl -X POST http://localhost:18791/type \
  -H "Content-Type: application/json" \
  -d '{
    "ref": "2",
    "text": "Hello World",
    "profile": "default"
  }'
```

#### 测试 6: 导航

```bash
curl -X POST http://localhost:18791/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.google.com",
    "profile": "default"
  }'
```

#### 测试 7: 标签页管理

```bash
# 列出所有标签页
curl http://localhost:18791/tabs?profile=default

# 关闭标签页
curl -X DELETE http://localhost:18791/tabs/<targetId>?profile=default

# 聚焦标签页
curl -X POST http://localhost:18791/tabs/focus \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "page-guid-xxx",
    "profile": "default"
  }'
```

#### 测试 8: 停止浏览器

```bash
curl -X POST http://localhost:18791/stop \
  -H "Content-Type: application/json" \
  -d '{"profile": "default"}'
```

---

### **Step 4: 使用 CLI 命令测试（集成测试）**

```bash
# 启动浏览器
kline browser start --profile default

# 打开网页
kline browser open https://www.example.com

# 查看标签页
kline browser tabs

# 获取快照
kline browser snapshot

# 截图
kline browser screenshot --output test.png

# 导航
kline browser navigate https://www.google.com

# 查看状态
kline browser status

# 停止浏览器
kline browser stop
```

---

## 🔍 调试工具

### 1. Chrome DevTools 直接连接

打开另一个 Chrome 浏览器，访问：

```
chrome://inspect/#devices

# 或手动连接
chrome-devtools://devtools/bundled/inspector.html?ws=127.0.0.1:18800/devtools/browser/<websocket-id>
```

### 2. WebSocket 测试工具

使用 `wscat` 测试 CDP WebSocket 连接：

```bash
# 安装 wscat
npm install -g wscat

# 获取 WebSocket URL
WS_URL=$(curl -s http://127.0.0.1:18800/json/version | jq -r '.webSocketDebuggerUrl')

# 连接
wscat -c "$WS_URL"

# 发送 CDP 命令
> {"id": 1, "method": "Page.enable"}
> {"id": 2, "method": "Page.navigate", "params": {"url": "https://example.com"}}
```

### 3. Playwright 直接测试

创建测试脚本 `test-playwright.ts`:

```typescript
import { chromium } from 'playwright';

async function test() {
  try {
    console.log('🔌 连接 CDP...');
    
    const browser = await chromium.connectOverCDP('http://127.0.0.1:18800');
    
    console.log('✅ 连接成功!');
    
    const context = browser.contexts()[0];
    const pages = context.pages();
    
    console.log(`📑 当前标签页数：${pages.length}`);
    
    // 打开新页面
    const page = await context.newPage();
    await page.goto('https://www.example.com');
    
    console.log('🌐 已打开页面:', await page.title());
    
    // 获取页面内容
    const content = await page.content();
    console.log('📄 页面长度:', content.length);
    
    // 截图
    await page.screenshot({ path: 'test-playwright.png' });
    console.log('📸 截图已保存');
    
    // 保持连接
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await browser.close();
    console.log('👋 连接已关闭');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

test();
```

运行：
```bash
npx tsx test-playwright.ts
```

---

## ✅ 测试验证清单

### 基础功能测试

- [ ] Chrome 浏览器能够正常启动
- [ ] CDP 端口（18800）可访问
- [ ] `/json/version` 返回浏览器信息
- [ ] `/json/list` 返回标签页列表
- [ ] WebSocket 连接成功

### HTTP API 测试

- [ ] `POST /start` - 启动浏览器成功
- [ ] `POST /tabs/open` - 打开网页成功
- [ ] `GET /tabs` - 列出标签页成功
- [ ] `GET /snapshot` - 获取页面快照成功
- [ ] `POST /screenshot` - 截图成功
- [ ] `POST /click` - 点击元素成功
- [ ] `POST /type` - 输入文本成功
- [ ] `POST /navigate` - 导航成功
- [ ] `DELETE /tabs/:id` - 关闭标签页成功
- [ ] `POST /stop` - 停止浏览器成功

### CLI 命令测试

- [ ] `kline browser start` 正常工作
- [ ] `kline browser open <url>` 正常工作
- [ ] `kline browser tabs` 正常工作
- [ ] `kline browser snapshot` 正常工作
- [ ] `kline browser screenshot` 正常工作
- [ ] `kline browser navigate <url>` 正常工作
- [ ] `kline browser stop` 正常工作

### 安全功能测试（如启用）

- [ ] 无认证时返回 401（如启用认证）
- [ ] 提供正确 API Key 时请求成功
- [ ] 私有 IP URL 被 SSRF 防护拦截
- [ ] 超过速率限制时返回 429

---

## 🐛 常见问题排查

### 问题 1: 浏览器启动失败

**症状**: `Error: Chrome executable not found`

**解决方案**:
```bash
# macOS - 指定 Chrome 路径
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# 或在配置文件中指定
{
  profiles: {
    default: {
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    }
  }
}
```

### 问题 2: CDP 端口不可用

**症状**: `CDP not ready on port 18800`

**解决方案**:
```bash
# 检查端口是否被占用
lsof -i :18800

# 更换端口
{
  profiles: {
    default: {
      cdpPort: 18802  // 使用其他端口
    }
  }
}
```

### 问题 3: WebSocket 连接失败

**症状**: WebSocket 连接立即断开

**解决方案**:
- 检查防火墙设置
- 确认浏览器使用 `--remote-debugging-port` 启动
- 检查 Chrome 版本是否过旧

### 问题 4: Playwright 无法连接

**症状**: `browserType.connectOverCDP: connect ECONNREFUSED`

**解决方案**:
```bash
# 确认浏览器已启动且 CDP 端口可访问
curl http://127.0.0.1:18800/json/version

# 检查 Playwright 版本
pnpm list playwright

# 更新 Playwright
pnpm update playwright
```

---

## 📊 性能测试（可选）

### 并发请求测试

```bash
# 使用 autocannon 测试 API 性能
npm install -g autocannon

# 测试快照接口
autocannon -c 10 -d 30 http://localhost:18791/snapshot

# 测试限流功能
autocannon -c 100 -d 10 http://localhost:18791/tabs
```

### 内存使用测试

```bash
# 监控浏览器进程内存
ps aux | grep chrome

# 或使用 Activity Monitor (macOS)
```

---

## 📚 参考资料

- [Chrome DevTools Protocol 文档](https://chromedevtools.github.io/devtools-protocol/)
- [Playwright CDP 文档](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)
- [项目安全指南](./SECURITY_GUIDE.md)

---

## 🎯 下一步

完成基础测试后，可以：

1. 编写自动化测试脚本（使用 Jest/Vitest）
2. 集成到 CI/CD 流程
3. 性能基准测试
4. 压力测试

祝测试顺利！🚀
