# Akshare MCP 安装指南

## 问题说明

在 macOS 上使用 `uv sync` 安装依赖时，可能会遇到 `curl-cffi` 包构建失败的问题。这是因为：

1. **Python 3.14 兼容性问题**: uv 可能使用 Python 3.14（测试版本）
2. **构建环境问题**: `curl-cffi` 需要从源码编译，需要 Xcode 命令行工具
3. **沙箱限制**: 在某些环境中，构建脚本无法访问特定目录

## 解决方案

### 方案 1：使用 pip 安装（推荐）

```bash
cd akshare

# 1. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 2. 升级 pip
pip install --upgrade pip

# 3. 安装依赖
pip install -r requirements.txt
```

### 方案 2：使用 uv 但指定 Python 版本

```bash
cd akshare

# 使用 Python 3.11 或 3.12
uv venv --python 3.11
uv sync
```

### 方案 3：安装 Xcode 命令行工具

```bash
# 安装 Xcode 命令行工具
xcode-select --install

# 然后重试
cd akshare
uv sync
```

### 方案 4：使用预编译的 curl-cffi

```bash
cd akshare

# 先安装 curl-impersonate（使用 Homebrew）
brew install curl-impersonate

# 然后安装 Python 包
pip install curl-cffi==0.6.0
pip install -r requirements.txt
```

### 方案 5：使用 Docker（最可靠）

创建一个 Dockerfile：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "akshare"]
```

然后运行：

```bash
docker build -t akshare-mcp .
docker run -it akshare-mcp python -m akshare
```

## 快速验证

安装完成后，验证是否成功：

```bash
cd akshare
python -c "import akshare; print(akshare.__version__)"
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

## 常见问题

### Q1: `xcrun: error: invalid active developer path`

**解决方案**: 安装 Xcode 命令行工具

```bash
xcode-select --install
```

### Q2: `PermissionError: [Errno 1] Operation not permitted`

**解决方案**: 这是沙箱环境问题，建议使用虚拟环境或 Docker

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Q3: `curl-cffi` 构建失败

**解决方案 1**: 使用预编译版本

```bash
pip install curl-cffi==0.6.0
pip install -r requirements.txt
```

**解决方案 2**: 安装系统级 curl

```bash
# macOS
brew install curl-impersonate

# Ubuntu/Debian
sudo apt-get install curl

# 然后重试
pip install -r requirements.txt
```

### Q4: akshare 版本冲突

**解决方案**: 使用特定版本

```bash
pip install akshare==1.14.0
pip install -r requirements.txt
```

## 推荐的安装流程（macOS）

```bash
# 1. 确保安装了 Xcode 命令行工具
xcode-select --install

# 2. 安装 Homebrew（如果没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 3. 安装 curl-impersonate
brew install curl-impersonate

# 4. 进入项目目录
cd akshare

# 5. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 6. 安装依赖
pip install --upgrade pip
pip install -r requirements.txt

# 7. 验证安装
python example.py
```

## Windows 用户

Windows 用户建议使用 WSL2 或 Docker：

### 使用 WSL2

```bash
# 在 WSL2 中
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv curl
cd akshare
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 使用 Docker

参考上面的 Docker 方案。

## Linux 用户

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv curl libcurl4-openssl-dev

cd akshare
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 安装后测试

```bash
# 测试 akshare
python -c "import akshare; print('Akshare version:', akshare.__version__)"

# 测试 MCP 服务
python -m akshare --help

# 运行示例
python example.py
```

## 性能优化

安装完成后，可以安装可选的优化包：

```bash
# 加速 JSON 处理
pip install orjson

# 加速 HTTP 请求
pip install aiohttp

# 缓存支持
pip install cachetools
```

## 卸载

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
pip install -r requirements.txt
```

## 获取帮助

如果以上方法都无法解决问题：

1. 查看错误日志的完整输出
2. 检查 Python 版本：`python3 --version`
3. 检查 pip 版本：`pip --version`
4. 尝试使用不同版本的 akshare
5. 在 GitHub 上提交 Issue

## 替代方案

如果实在无法安装 akshare，可以考虑：

1. **使用 Yahoo Finance MCP**: 查询美股、港股数据
2. **使用其他数据源**: 如 tushare、baostock 等
3. **使用在线 API**: 如新浪财经、腾讯财经等

---

**最后更新**: 2026-03-27
