#!/bin/bash

# 浏览器控制服务启动脚本

echo "🚀 Starting Kline Browser Control Service..."

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f1 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js version must be 18 or higher"
  exit 1
fi

# 创建必要的目录
mkdir -p data/browsers/default/user-data
mkdir -p data/browsers/finance/user-data
mkdir -p logs

# 检查浏览器配置文件
if [ ! -f "browser-config.json" ]; then
  echo "⚠️  browser-config.json not found, using default configuration"
fi

# 启动服务
echo "📡 Starting browser control service on port 18791..."

# 使用 tsx 运行开发模式
if command -v pnpm &> /dev/null; then
  pnpm tsx src/browser/server.ts
else
  npx tsx src/browser/server.ts
fi
