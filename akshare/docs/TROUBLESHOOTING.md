# 安装问题说明和解决方案

## 问题描述

在 macOS 上执行 `uv sync` 时，遇到 `curl-cffi` 包构建失败的错误：

```
× Failed to build `curl-cffi==0.14.0`
  × Failed to build `curl-cffi`
  PermissionError: [Errno 1] Operation not permitted: '/Users/runner'
```

## 根本原因

1. **Python 3.14 兼容性问题**: uv 可能使用了 Python 3.14（测试版本），导致兼容性问题
2. **沙箱环境限制**: 构建脚本尝试访问 `/Users/runner` 目录，但在沙箱环境中被拒绝
3. **缺少 Xcode 命令行工具**: macOS 系统缺少必要的编译工具
4. **curl-cffi 需要从源码编译**: 没有可用的预编译 wheel 包

## 解决方案

### ✅ 方案 1: 使用 pip + 虚拟环境（推荐）

```bash
cd akshare

# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 升级 pip
pip install --upgrade pip

# 安装依赖
pip install -r requirements.txt
```

**优点**:
- 不依赖 uv
- 使用系统 Python
- 避免沙箱问题

**缺点**:
- 需要手动激活虚拟环境

### ✅ 方案 2: 使用自动安装脚本

```bash
cd akshare
./install.sh
```

脚本会自动：
- 检测操作系统
- 检查必要的工具
- 创建虚拟环境
- 安装依赖

### ✅ 方案 3: 使用 Docker（最可靠）

```bash
# 构建镜像
docker build -t akshare-mcp .

# 运行测试
docker run -it akshare-mcp python example.py

# 运行 MCP 服务
docker run -it akshare-mcp python -m akshare --transport stdio
```

**优点**:
- 完全隔离的环境
- 避免所有系统依赖问题
- 可重复的构建

**缺点**:
- 需要安装 Docker
- 镜像体积较大

### ✅ 方案 4: 安装 Xcode 命令行工具

```bash
# 安装 Xcode 命令行工具
xcode-select --install

# 然后重试
cd akshare
uv sync
```

### ✅ 方案 5: 使用预编译的 curl-cffi

```bash
# 先安装 curl-impersonate（使用 Homebrew）
brew install curl-impersonate

# 然后安装 Python 包
pip install curl-cffi==0.6.0
pip install -r requirements.txt
```

## 推荐的安装流程

### macOS 用户

```bash
# 1. 安装 Xcode 命令行工具（可选，但推荐）
xcode-select --install

# 2. 使用 pip 安装（最简单）
cd akshare
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. 测试
python example.py
```

### Linux 用户

```bash
# 1. 安装系统依赖
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv curl

# 2. 安装 Python 依赖
cd akshare
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. 测试
python example.py
```

### Windows 用户（WSL2）

```bash
# 1. 在 WSL2 中安装依赖
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv curl

# 2. 安装 Python 依赖
cd akshare
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. 测试
python example.py
```

## 验证安装

安装完成后，运行以下命令验证：

```bash
cd akshare

# 激活虚拟环境（如果使用了虚拟环境）
source .venv/bin/activate

# 测试 akshare
python -c "import akshare; print('Akshare version:', akshare.__version__)"

# 运行示例
python example.py
```

如果看到类似以下输出，说明安装成功：

```
=== Akshare MCP Server Example ===

1. Getting quote for 600519 (Kweichow Moutai)...
   Symbol: 600519
   Name: 贵州茅台
   Price: 1688.50
   ...
```

## 常见错误及解决方案

### 错误 1: xcrun: error: invalid active developer path

**原因**: 缺少 Xcode 命令行工具

**解决方案**:
```bash
xcode-select --install
```

### 错误 2: PermissionError: [Errno 1] Operation not permitted

**原因**: 沙箱环境限制

**解决方案**: 使用虚拟环境或 Docker
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 错误 3: curl-cffi 构建失败

**原因**: 缺少系统级 curl 库

**解决方案**:
```bash
# macOS
brew install curl-impersonate

# Ubuntu/Debian
sudo apt-get install libcurl4-openssl-dev

# 然后重试
pip install -r requirements.txt
```

### 错误 4: ModuleNotFoundError: No module named 'akshare'

**原因**: 虚拟环境未激活

**解决方案**:
```bash
source .venv/bin/activate
```

## 性能优化建议

安装完成后，可以安装可选的优化包：

```bash
# 加速 JSON 处理
pip install orjson

# 加速 HTTP 请求
pip install aiohttp

# 缓存支持
pip install cachetools
```

## 卸载和重新安装

如果需要重新安装：

```bash
cd akshare

# 删除虚拟环境
rm -rf .venv

# 删除缓存
rm -rf ~/.cache/pip
rm -rf ~/.cache/uv

# 重新安装
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 获取帮助

如果以上方法都无法解决问题：

1. **查看完整错误日志**:
   ```bash
   pip install -r requirements.txt -v
   ```

2. **检查 Python 版本**:
   ```bash
   python3 --version
   ```

3. **检查 pip 版本**:
   ```bash
   pip --version
   ```

4. **尝试使用不同版本的 akshare**:
   ```bash
   pip install akshare==1.14.0
   ```

5. **查看文档**:
   - [INSTALL_GUIDE.md](./INSTALL_GUIDE.md) - 详细安装指南
   - [QUICKSTART.md](./QUICKSTART.md) - 快速入门
   - [README.md](./README.md) - 完整文档

## 替代方案

如果实在无法安装 akshare，可以考虑：

1. **使用 Yahoo Finance MCP**: 查询美股、港股数据
2. **使用其他 A 股数据源**: 如 tushare、baostock 等
3. **使用在线 API**: 如新浪财经、腾讯财经等

## 总结

**推荐的安装方法**（按优先级）:

1. ✅ **pip + 虚拟环境** - 简单可靠
2. ✅ **Docker** - 最可靠，完全隔离
3. ✅ **自动安装脚本** - 自动化安装流程
4. ⚠️ **uv sync** - 可能会遇到构建问题

**关键点**:
- macOS 用户建议先安装 Xcode 命令行工具
- 使用虚拟环境避免污染系统 Python
- Docker 是最可靠的方案
- 查看详细错误日志有助于排查问题

---

**最后更新**: 2026-03-27
