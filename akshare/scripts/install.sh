#!/bin/bash
# Akshare MCP 安装脚本
# 自动检测系统并提供合适的安装方案

set -e

echo "=== Akshare MCP 安装脚本 ==="
echo ""

# 检测操作系统
OS="$(uname -s)"

case "$OS" in
    Darwin)
        echo "检测到 macOS 系统"
        echo ""
        
        # 检查是否安装了 Xcode 命令行工具
        if xcode-select -p &> /dev/null; then
            echo "✓ Xcode 命令行工具已安装"
        else
            echo "✗ 未安装 Xcode 命令行工具"
            echo ""
            echo "请先安装 Xcode 命令行工具："
            echo "  xcode-select --install"
            echo ""
            echo "或者使用以下方案："
            echo ""
            echo "方案 1: 使用虚拟环境（推荐）"
            echo "  python3 -m venv .venv"
            echo "  source .venv/bin/activate"
            echo "  pip install -r requirements.txt"
            echo ""
            echo "方案 2: 使用 Docker（最可靠）"
            echo "  docker build -t akshare-mcp ."
            echo "  docker run -it akshare-mcp python -m akshare"
            echo ""
            exit 1
        fi
        
        # 检查是否安装了 Homebrew
        if command -v brew &> /dev/null; then
            echo "✓ Homebrew 已安装"
            
            # 检查是否安装了 curl-impersonate
            if brew list curl-impersonate &> /dev/null; then
                echo "✓ curl-impersonate 已安装"
            else
                echo "安装 curl-impersonate..."
                brew install curl-impersonate || true
            fi
        else
            echo "⚠ Homebrew 未安装（可选）"
        fi
        
        echo ""
        echo "开始安装 Python 依赖..."
        
        # 创建虚拟环境
        if [ ! -d ".venv" ]; then
            echo "创建虚拟环境..."
            python3 -m venv .venv
        fi
        
        echo "激活虚拟环境..."
        source .venv/bin/activate
        
        echo "升级 pip..."
        pip install --upgrade pip
        
        echo "安装依赖..."
        pip install -r requirements.txt
        
        echo ""
        echo "✓ 安装完成！"
        echo ""
        echo "测试运行："
        echo "  source .venv/bin/activate"
        echo "  python example.py"
        echo ""
        ;;
        
    Linux)
        echo "检测到 Linux 系统"
        echo ""
        
        # 检测包管理器
        if command -v apt-get &> /dev/null; then
            echo "检测到 Debian/Ubuntu 系统"
            echo "安装系统依赖..."
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv curl
        elif command -v yum &> /dev/null; then
            echo "检测到 CentOS/RHEL 系统"
            echo "安装系统依赖..."
            sudo yum install -y python3 python3-pip python3-virtualenv curl
        fi
        
        echo ""
        echo "创建虚拟环境..."
        python3 -m venv .venv
        
        echo "激活虚拟环境..."
        source .venv/bin/activate
        
        echo "升级 pip..."
        pip install --upgrade pip
        
        echo "安装依赖..."
        pip install -r requirements.txt
        
        echo ""
        echo "✓ 安装完成！"
        echo ""
        ;;
        
    *)
        echo "不支持的操作系统：$OS"
        echo ""
        echo "请使用 Docker 安装："
        echo "  docker build -t akshare-mcp ."
        echo "  docker run -it akshare-mcp python -m akshare"
        exit 1
        ;;
esac

echo "=== 安装完成 ==="
echo ""
echo "下一步："
echo "1. 测试运行：python example.py"
echo "2. 运行 MCP 服务：python -m akshare --transport stdio"
echo "3. 查看文档：cat README.md"
echo ""
