# Akshare MCP 快速入门指南

## 1. 安装依赖

### ⚠️ macOS 用户注意

`uv sync` 可能会因为 `curl-cffi` 包的构建问题失败。如果遇到错误，请使用下面的 pip 方案。

### 方案 1: 使用 pip（推荐）

```bash
cd akshare

# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 方案 2: 使用自动安装脚本

```bash
cd akshare
./install.sh
```

### 方案 3: 使用 uv

```bash
# 安装 uv（如果还没有安装）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 进入 akshare 目录并安装依赖
cd akshare
uv sync
```

**如果 uv sync 失败**，请查看 [INSTALL_GUIDE.md](./INSTALL_GUIDE.md) 获取详细解决方案。

### 方案 4: 使用 Docker（最可靠）

```bash
# 构建镜像
docker build -t akshare-mcp .

# 运行测试
docker run -it akshare-mcp python example.py
```

## 2. 测试运行

### 运行示例脚本

```bash
cd akshare
uv run python example.py
```

这将执行以下测试：
- 获取贵州茅台（600519）的实时行情
- 批量获取多只股票行情
- 搜索股票
- 获取历史数据

### 作为 MCP 服务运行

**Stdio 模式（用于 Claude Desktop）：**

```bash
cd akshare
uv run python -m akshare --transport stdio
```

**HTTP 模式（用于 Web 应用）：**

```bash
cd akshare
uv run python -m akshare --transport http --http-port 8000
```

## 3. 在 Claude Desktop 中使用

### 配置 Claude Desktop

找到 Claude Desktop 配置文件：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

添加 akshare MCP 服务配置：

```json
{
  "mcpServers": {
    "akshare": {
      "command": "uv",
      "args": ["run", "python", "-m", "akshare"],
      "cwd": "/Users/pl/Codes/kitz/kline/akshare",
      "env": {}
    }
  }
}
```

**注意：** 将 `cwd` 替换为你实际的 akshare 目录路径。

### 重启 Claude Desktop

保存配置后，重启 Claude Desktop。

### 使用示例

现在你可以在 Claude Desktop 中询问股票相关的问题，例如：

```
帮我查询贵州茅台（600519）的当前股价
搜索所有包含"科技"的股票
获取宁德时代（300750）过去一个月的历史数据
比较一下银行股的市盈率
```

## 4. 常见问题排查

### Q: 安装时遇到依赖冲突

**解决方案：** 使用虚拟环境

```bash
cd akshare
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Q: 获取数据时出现错误

**可能原因：**
1. 网络连接问题
2. Akshare 数据源暂时不可用
3. 股票代码不正确

**解决方案：**
- 检查网络连接
- 验证股票代码是否正确（A 股代码格式：600xxx, 000xxx, 300xxx）
- 等待几分钟后重试

### Q: Claude Desktop 无法连接到 MCP 服务

**排查步骤：**

1. 检查配置路径是否正确
2. 手动测试 MCP 服务：
   ```bash
   cd akshare
   uv run python -m akshare --transport stdio
   ```
3. 查看 Claude Developer 控制台日志

## 5. 下一步

- 查看 [README.md](./README.md) 了解完整功能
- 查看 [example.py](./example.py) 学习编程接口
- 尝试在 Claude Desktop 中询问复杂的股票分析问题

## 6. 支持的股票类型

✅ A 股（上海证券交易所）
- 代码格式：600xxx, 601xxx, 603xxx, 688xxx

✅ A 股（深圳证券交易所）
- 代码格式：000xxx, 001xxx, 002xxx, 003xxx
- 创业板：300xxx, 301xxx

❌ 不支持的市场
- 港股（使用 yahoo-finance2 MCP）
- 美股（使用 yahoo-finance2 MCP）
- 基金、债券等

## 7. 性能优化建议

1. **批量查询**：使用 `get_stock_quotes` 代替多次 `get_stock_quote`
2. **缓存结果**：在应用层实现缓存，避免重复查询
3. **合理设置日期范围**：历史数据查询不超过 1 年
4. **避免高频请求**：建议间隔 1-2 秒

## 8. 开发工具推荐

- **IDE**: VS Code + Python 扩展
- **包管理**: uv（比 pip 快 10-100 倍）
- **代码格式化**: Black, isort
- **类型检查**: mypy
- **测试**: pytest

祝你使用愉快！🎉
