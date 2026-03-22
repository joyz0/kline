#!/bin/bash

# 检查 Redis 是否运行
if ! pgrep -x "redis-server" > /dev/null; then
    echo "❌ Redis is not running. Starting Redis..."
    
    # 检查是否安装了 Redis
    if command -v redis-server &> /dev/null; then
        redis-server --daemonize yes
        echo "✅ Redis started"
    else
        echo "⚠️  Redis not found. Please install Redis:"
        echo "   macOS: brew install redis"
        echo "   Or use Docker: docker run -d -p 6379:6379 redis:latest"
        exit 1
    fi
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please edit with your configuration."
fi

# 启动开发服务器
echo "🚀 Starting development server..."
pnpm dev
