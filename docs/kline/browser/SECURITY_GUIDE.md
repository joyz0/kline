# 浏览器控制安全模块使用指南

## 📋 概述

浏览器控制模块提供了完善的安全防护机制，包括：

- **SSRF 防护**：防止服务器端请求伪造攻击
- **认证中间件**：API 访问控制
- **速率限制**：防止滥用和 DDoS 攻击
- **安全响应头**：增强 HTTP 安全性

## 🔒 安全功能详解

### 1. SSRF 防护

**位置**: [`src/browser/security/ssrf-protection.ts`](file:///Users/pl/Codes/kitz/kline/src/browser/security/ssrf-protection.ts)

#### 功能特性

- ✅ 阻止访问私有 IP 地址（10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x）
- ✅ 阻止访问 localhost 和本地网络
- ✅ 仅允许 HTTP/HTTPS 协议
- ✅ URL  sanitization（移除敏感参数）

#### 使用示例

```typescript
import { validateUrl, isPrivateIP, sanitizeUrl } from '../security/ssrf-protection.js';

// 验证 URL
const isValid = validateUrl('https://example.com'); // true
const isInvalid = validateUrl('http://192.168.1.1'); // false - 私有 IP
const isInvalid2 = validateUrl('http://localhost:8080'); // false - localhost

// 检查 IP 是否为私有
const isPrivate = isPrivateIP('192.168.1.1'); // true
const isPublic = isPrivateIP('8.8.8.8'); // false

// 清理 URL（移除敏感参数）
const cleanUrl = sanitizeUrl('https://api.example.com/data?token=secret&key=123');
// 结果：https://api.example.com/data
```

#### 在路由中的集成

已在以下路由中自动启用 SSRF 检查：

- `POST /tabs/open` - 打开新标签页
- `POST /navigate` - 页面导航

```typescript
// 示例：tabs.ts 路由
if (!validateUrl(url)) {
  return res.status(400).json({
    error: "Bad Request",
    message: "Invalid URL. Private IP addresses and non-HTTP protocols are not allowed.",
    code: "INVALID_URL",
  });
}
```

---

### 2. 认证中间件

**位置**: [`src/browser/security/auth.ts`](file:///Users/pl/Codes/kitz/kline/src/browser/security/auth.ts)

#### 功能特性

- ✅ 支持 API Key 认证（`X-API-Key` 头）
- ✅ 支持 Bearer Token 认证（`Authorization` 头）
- ✅ 常量时间比较（防止时序攻击）
- ✅ 可配置是否启用

#### 配置方式

**方式 1: 环境变量**

```bash
# 启用认证
export BROWSER_API_SECRET="your-secret-key-here"
```

**方式 2: 配置文件**

在 `.kline/kline.json5` 中配置：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: 'default',
    security: {
      authEnabled: true,
      authSecret: 'your-secret-key-here',
    },
    profiles: { ... }
  }
}
```

#### 使用示例

**生成 API Key**

```typescript
import { generateApiKey, createApiKey } from '../security/auth.js';

// 生成随机 API Key
const apiKey = generateApiKey();
console.log(apiKey); // UUID 格式

// 创建带时间戳的 API Key
const keyInfo = createApiKey();
console.log(keyInfo.key); // API Key
console.log(keyInfo.createdAt); // 创建时间戳
```

**客户端请求示例**

```bash
# 使用 API Key
curl -H "X-API-Key: your-secret-key" \
  http://localhost:18791/tabs

# 使用 Bearer Token
curl -H "Authorization: Bearer your-secret-key" \
  http://localhost:18791/tabs

# 无认证（会返回 401）
curl http://localhost:18791/tabs
```

**响应示例**

```json
// 认证成功失败
{
  "error": "Unauthorized",
  "message": "Authentication required. Provide API key or Bearer token.",
  "code": "AUTH_MISSING"
}

// 认证 token 无效
{
  "error": "Unauthorized",
  "message": "Invalid authentication token.",
  "code": "AUTH_INVALID"
}
```

---

### 3. 速率限制

**位置**: [`src/browser/security/auth.ts`](file:///Users/pl/Codes/kitz/kline/src/browser/security/auth.ts)

#### 功能特性

- ✅ 基于客户端 IP 或 API Key 限流
- ✅ 可配置请求数和窗口大小
- ✅ 自动添加限流响应头
- ✅ 支持分布式限流（基于内存）

#### 配置方式

**配置文件** (`.kline/kline.json5`):

```json5
{
  browser: {
    security: {
      rateLimitEnabled: true,
      rateLimitMaxRequests: 100,  // 每窗口最大请求数
      rateLimitWindowMs: 60000,   // 窗口大小（毫秒）
    }
  }
}
```

#### 响应头

每次请求都会返回限流相关信息：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200000
```

#### 超限响应

```json
// HTTP 429 Too Many Requests
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Maximum 100 requests per 60 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

---

### 4. 安全响应头

**位置**: [`src/browser/security/auth.ts`](file:///Users/pl/Codes/kitz/kline/src/browser/security/auth.ts)

#### 自动添加的安全头

所有响应都会包含以下安全头：

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'none'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## 🚀 完整配置示例

### 开发环境配置

```json5
// .kline/kline.json5
{
  browser: {
    enabled: true,
    defaultProfile: 'default',
    security: {
      // 开发环境禁用认证，方便调试
      authEnabled: false,
      
      // 启用限流防止误操作
      rateLimitEnabled: true,
      rateLimitMaxRequests: 1000,
      rateLimitWindowMs: 60000,
      
      // 启用 SSRF 防护
      ssrfProtectionEnabled: true,
    },
    profiles: {
      default: {
        cdpPort: 18800,
        userDataDir: './data/browsers/default/user-data',
        headless: false,
        color: '#FF4500',
      }
    }
  }
}
```

### 生产环境配置

```json5
// .kline/kline.json5
{
  browser: {
    enabled: true,
    defaultProfile: 'default',
    security: {
      // 生产环境必须启用认证
      authEnabled: true,
      authSecret: '${env:BROWSER_API_SECRET}', // 从环境变量读取
      
      // 严格的限流配置
      rateLimitEnabled: true,
      rateLimitMaxRequests: 100,
      rateLimitWindowMs: 60000,
      
      // 启用 SSRF 防护
      ssrfProtectionEnabled: true,
    },
    profiles: {
      default: {
        cdpPort: 18800,
        userDataDir: './data/browsers/default/user-data',
        headless: true,
        color: '#FF4500',
      }
    }
  }
}
```

对应的环境变量：

```bash
# .env
BROWSER_API_SECRET="your-production-secret-key-here"
```

---

## 📝 API 使用示例

### 1. 启动浏览器服务

```bash
# 无认证（开发环境）
kline browser start

# 带认证（生产环境）
kline browser start --profile default
```

### 2. 打开网页

```bash
# 有效 URL
kline browser open https://example.com

# 无效 URL（会被 SSRF 防护拦截）
kline browser open http://192.168.1.1
# 错误：Invalid URL. Private IP addresses and non-HTTP protocols are not allowed.
```

### 3. 获取页面快照

```bash
# 无认证
kline browser snapshot

# 带认证
curl -H "X-API-Key: your-secret-key" \
  http://localhost:18791/snapshot
```

### 4. 标签页管理

```bash
# 列出标签页
kline browser tabs

# 关闭标签页
kline browser close <targetId>
```

---

## 🔐 安全最佳实践

### 1. API Key 管理

- ✅ 使用强随机密钥（UUID 格式）
- ✅ 定期轮换 API Key
- ✅ 不在代码中硬编码密钥
- ✅ 使用环境变量或密钥管理服务

```bash
# 生成安全的 API Key
node -e "console.log(require('crypto').randomUUID())"
```

### 2. 网络隔离

- ✅ 浏览器服务仅监听 localhost（127.0.0.1）
- ✅ 使用防火墙限制访问
- ✅ 在容器或内网中运行

### 3. 速率限制配置

根据使用场景调整限流配置：

```json5
// 高流量场景
{
  rateLimitMaxRequests: 1000,
  rateLimitWindowMs: 60000,
}

// 低流量场景
{
  rateLimitMaxRequests: 50,
  rateLimitWindowMs: 60000,
}
```

### 4. 监控和日志

所有安全相关事件都会记录到日志：

```typescript
// 认证失败日志
browserLogger.warn(
  { path: req.path, method: req.method },
  'Unauthorized access attempt - no token'
);

// 限流超限日志
browserLogger.warn(
  { clientId, path: req.path, count: clientData.count },
  'Rate limit exceeded'
);
```

---

## 🛠️ 故障排查

### 问题 1: 收到 401 Unauthorized 错误

**原因**: 认证已启用但未提供有效 token

**解决方案**:

```bash
# 方式 1: 提供 API Key
export BROWSER_API_SECRET="your-key"
curl -H "X-API-Key: $BROWSER_API_SECRET" http://localhost:18791/tabs

# 方式 2: 开发环境禁用认证
# 在配置文件中设置 authEnabled: false
```

### 问题 2: 收到 429 Too Many Requests 错误

**原因**: 触发速率限制

**解决方案**:

```bash
# 等待重试时间
sleep 30

# 或调整限流配置
# 在配置文件中增加 rateLimitMaxRequests
```

### 问题 3: URL 被 SSRF 防护拦截

**原因**: 尝试访问私有地址

**解决方案**:

```bash
# 使用公网 URL
kline browser open https://example.com

# 开发环境需要访问本地服务时，暂时禁用 SSRF 防护
# 不推荐在生产环境禁用！
```

---

## 📚 参考资料

- [OWASP SSRF 防护指南](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [RFC 6750 - Bearer Token 认证](https://tools.ietf.org/html/rfc6750)
- [HTTP 速率限制最佳实践](https://www.ietf.org/archive/id/draft-polli-ratelimit-headers-03.html)
