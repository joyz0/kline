# CDP 浏览器控制测试 - 快速开始

## 🚀 快速测试流程

### 1️⃣ 准备配置

修改 `.kline/kline.json5`，**测试环境建议禁用认证**：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: 'default',
    security: {
      authEnabled: false,  // 测试时禁用认证
      rateLimitEnabled: false,  // 测试时禁用限流
    },
    profiles: {
      default: {
        cdpPort: 18800,
        userDataDir: './data/browsers/default/user-data',
        headless: false,
      }
    }
  }
}
```

### 2️⃣ 启动浏览器服务

```bash
# 方式 1: 使用 pnpm dev（推荐）
pnpm dev

# 方式 2: 直接启动浏览器控制服务
kline browser start
```

保持服务运行，**打开新终端**继续测试。

### 3️⃣ 运行测试（3 种方式任选）

#### 方式 A: CDP 连接测试（最基础）

测试 CDP 端口是否可访问：

```bash
pnpm run test:cdp
```

**预期输出**:
```
🔍 开始 CDP 连接测试...

📋 测试 1: 获取浏览器版本信息
✅ 成功获取版本信息

📑 测试 2: 列出可用标签页
✅ 找到 X 个标签页

🔌 测试 3: WebSocket 连接测试
✅ WebSocket 连接成功

✅ 所有测试完成!
```

#### 方式 B: Playwright 控制测试（推荐）

测试通过 Playwright 控制浏览器：

```bash
pnpm run test:playwright
```

**预期输出**:
```
🔍 开始 Playwright CDP 控制测试...

📌 步骤 1: 连接 CDP
✅ CDP 连接成功

📄 步骤 3: 创建新页面
🌐 步骤 4: 导航到 example.com
✅ 导航成功

📸 步骤 6: 截图
✅ 截图已保存到：./test-playwright-cdp.png

✅ 所有测试完成!
🎉 测试成功!
```

#### 方式 C: HTTP API 完整测试（最全面）

测试完整的 HTTP API 接口：

```bash
pnpm run test:api
```

**预期输出**:
```
🔍 开始 HTTP API 测试

📋 测试 1: 启动浏览器 (POST /start)
✅ 通过

📋 测试 3: 打开网页 (POST /tabs/open)
✅ 通过

📋 测试 5: 获取页面快照 (GET /snapshot)
✅ 通过

📋 测试 8: SSRF 防护测试
✅ 通过 - SSRF 防护正常工作

==================================================
📊 测试总结
==================================================

总计：9 个测试
✅ 通过：9
❌ 失败：0
成功率：100.0%

🎉 所有测试通过!
```

---

## 📝 手动测试（使用 curl）

### 检查 CDP 端口

```bash
# 获取浏览器版本
curl http://127.0.0.1:18800/json/version

# 列出标签页
curl http://127.0.0.1:18800/json/list
```

### 测试 HTTP API

```bash
# 启动浏览器
curl -X POST http://localhost:18791/start \
  -H "Content-Type: application/json" \
  -d '{"profile": "default"}'

# 打开网页
curl -X POST http://localhost:18791/tabs/open \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "profile": "default"}'

# 列出标签页
curl "http://localhost:18791/tabs?profile=default"

# 获取快照
curl "http://localhost:18791/snapshot?profile=default"

# 截图
curl -X POST http://localhost:18791/screenshot \
  -H "Content-Type: application/json" \
  -d '{"profile": "default"}' \
  --output screenshot.png

# 停止浏览器
curl -X POST http://localhost:18791/stop \
  -H "Content-Type: application/json" \
  -d '{"profile": "default"}'
```

---

## 🔍 故障排查

### 问题 1: 连接被拒绝 (ECONNREFUSED)

**症状**:
```
Error: connect ECONNREFUSED 127.0.0.1:18800
```

**解决方案**:

```bash
# 1. 检查浏览器是否启动
ps aux | grep chrome

# 2. 检查端口是否监听
lsof -i :18800

# 3. 启动浏览器
pnpm dev
# 或
kline browser start
```

### 问题 2: 认证失败 (401 Unauthorized)

**症状**:
```
Error: HTTP 401 - Authentication required
```

**解决方案**:

```bash
# 方式 1: 禁用认证（测试环境）
# 编辑 .kline/kline.json5
{
  security: {
    authEnabled: false
  }
}

# 方式 2: 提供 API Key
export BROWSER_API_SECRET="your-secret-key"

# 测试时添加 header
curl -H "X-API-Key: $BROWSER_API_SECRET" \
  http://localhost:18791/tabs
```

### 问题 3: Chrome 未找到

**症状**:
```
Error: Chrome executable not found
```

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

### 问题 4: SSRF 防护拦截

**症状**:
```
Error: Invalid URL. Private IP addresses not allowed
```

**解决方案**:

这是**正常行为**，说明 SSRF 防护在工作。

测试时使用公网 URL：
```bash
# ✅ 正确
kline browser open https://example.com

# ❌ 错误（会被拦截）
kline browser open http://192.168.1.1
kline browser open http://localhost:8080
```

---

## ✅ 测试验证清单

完成后应该能够：

- [ ] 成功启动浏览器（可见窗口）
- [ ] CDP 端口 18800 可访问
- [ ] 通过 Playwright 连接浏览器
- [ ] 打开网页并获取内容
- [ ] 获取页面快照（ARIA 格式）
- [ ] 截图并保存文件
- [ ] 导航到新 URL
- [ ] SSRF 防护正常拦截私有地址
- [ ] 正常停止浏览器

---

## 📚 相关文档

- [完整测试指南](./CDP_TEST_GUIDE.md) - 详细的测试方案和调试工具
- [安全使用指南](./SECURITY_GUIDE.md) - 安全模块配置和使用
- [WEB_BROWSER.md](../openclaw/WEB_BROWSER.md) - 原始设计文档

---

## 🎯 下一步

测试通过后，可以：

1. **启用安全功能**（生产环境）
   ```json5
   {
     security: {
       authEnabled: true,
       authSecret: '${env:BROWSER_API_SECRET}',
       rateLimitEnabled: true,
     }
   }
   ```

2. **编写自动化测试**
   - 使用 Jest/Vitest 编写单元测试
   - 集成到 CI/CD 流程

3. **性能测试**
   ```bash
   # 使用 autocannon 测试 API 性能
   npm install -g autocannon
   autocannon -c 10 -d 30 http://localhost:18791/snapshot
   ```

4. **开发实际应用**
   - 查看 CLI 命令：`kline browser --help`
   - 使用 HTTP API 开发自定义功能

祝测试顺利！🎉
