#!/data/data/com.termux/files/usr/bin/bash
#
# VSCode Server on Android (Termux) - 启动脚本
# 用法: ./start.sh
#
# 同时启动 code-server (:8080) 和本地网页仪表板 (:3000)
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║   🚀 VSCode Server 启动中...                  ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────
# 0. 确保 PATH 包含必要目录
# ─────────────────────────────────────────────
export PATH="$HOME/.local/bin:$PATH"

# Ctrl+C 时自动清理子进程（显式杀 PID，避免 kill 0 广播到无关进程）
cleanup() {
    echo ""
    echo -e "${YELLOW}[清理] 正在终止所有服务...${NC}"
    if [ -f "$SCRIPT_DIR/.code-server.pid" ]; then
        kill -TERM "$(cat "$SCRIPT_DIR/.code-server.pid")" 2>/dev/null
        rm -f "$SCRIPT_DIR/.code-server.pid"
    fi
    if [ -f "$SCRIPT_DIR/.web-server.pid" ]; then
        kill -TERM "$(cat "$SCRIPT_DIR/.web-server.pid")" 2>/dev/null
        rm -f "$SCRIPT_DIR/.web-server.pid"
    fi
    exit 0
}
trap cleanup INT TERM

# ─────────────────────────────────────────────
# 1. 清理旧进程
# ─────────────────────────────────────────────
echo -e "${YELLOW}[1/4] 清理旧进程...${NC}"

kill_old() {
    local port=$1
    local pid
    # Android 10+ 限制 ss -tlnp 获取 PID，同时尝试 fuser
    pid=$(ss -tlnp 2>/dev/null | grep ":${port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
    if [ -z "$pid" ] || ! [ "$pid" -gt 0 ] 2>/dev/null; then
        # 备选：fuser (Android 10+ 仍可用)
        pid=$(fuser ${port}/tcp 2>/dev/null | awk '{print $NF}' | tr -d ' ')
    fi
    if [ -n "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null && echo -e "  ${GREEN}✓ 已终止端口 ${port} 上的旧进程 (PID: ${pid})${NC}" || true
    fi
}

kill_old 8080
kill_old 3000

sleep 1

# ─────────────────────────────────────────────
# 2. 检测 code-server
# ─────────────────────────────────────────────
echo -e "${YELLOW}[2/4] 检测 code-server...${NC}"

CODE_SERVER=""

# 优先查找全局安装的
if command -v code-server &>/dev/null; then
    CODE_SERVER="$(command -v code-server)"
# 查找本地安装目录（避免扫描整个 Termux 文件系统）
elif [ -f "$HOME/.local/bin/code-server" ]; then
    CODE_SERVER="$HOME/.local/bin/code-server"
elif [ -f "${PREFIX:-/data/data/com.termux/files/usr}/bin/code-server" ]; then
    CODE_SERVER="${PREFIX:-/data/data/com.termux/files/usr}/bin/code-server"
else
    # 最后一个兜底：仅扫描常规安装目录
    local_prefix="${PREFIX:-/data/data/com.termux/files/usr}"
    CODE_SERVER=$(find "$HOME/.local/bin" "${local_prefix}/bin" "$HOME/.npm-global/bin" -name code-server -type f -executable 2>/dev/null | head -1)
fi

if [ -z "$CODE_SERVER" ]; then
    echo -e "${RED}[错误] 未找到 code-server${NC}"
    echo -e "${YELLOW}  请先运行: ./setup.sh${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ code-server: $CODE_SERVER${NC}"

# ─────────────────────────────────────────────
# 3. 启动 code-server
# ─────────────────────────────────────────────
echo -e "${YELLOW}[3/4] 启动 code-server (端口 8080)...${NC}"

# 确保配置目录存在
mkdir -p "$HOME/.config/code-server"

# 如果配置文件不存在，创建一个
if [ ! -f "$HOME/.config/code-server/config.yaml" ]; then
    cat > "$HOME/.config/code-server/config.yaml" << 'YAML'
bind-addr: 127.0.0.1:8080
auth: none
cert: false
YAML
fi

"$CODE_SERVER" --bind-addr 127.0.0.1:8080 --auth none \
    1>/dev/null 2>"$HOME/.code-server-error.log" &
CODE_SERVER_PID=$!

sleep 1
if kill -0 "$CODE_SERVER_PID" 2>/dev/null; then
    echo -e "${GREEN}  ✓ code-server 已启动 (PID: $CODE_SERVER_PID)${NC}"
else
    echo -e "${RED}  ✗ code-server 启动失败${NC}"
    echo -e "${YELLOW}  请查看错误日志: cat ~/.code-server-error.log${NC}"
    exit 1
fi

# ─────────────────────────────────────────────
# 4. 启动本地网页服务器
# ─────────────────────────────────────────────
echo -e "${YELLOW}[4/4] 启动网页仪表板 (端口 3000)...${NC}"

# 使用 Python 内置 HTTP 服务器
cd "$SCRIPT_DIR"
python -m http.server 3000 --bind 127.0.0.1 \
    1>/dev/null 2>"$HOME/.web-server-error.log" &
WEB_PID=$!

sleep 0.5
if kill -0 "$WEB_PID" 2>/dev/null; then
    echo -e "${GREEN}  ✓ 网页服务器已启动 (PID: $WEB_PID)${NC}"
else
    echo -e "${RED}  ✗ 网页服务器启动失败${NC}"
    echo -e "${YELLOW}  请查看错误日志: cat ~/.web-server-error.log${NC}"
    # 清理已启动的 code-server，避免孤儿进程
    if kill -0 "$CODE_SERVER_PID" 2>/dev/null; then
        kill -TERM "$CODE_SERVER_PID" 2>/dev/null
        echo -e "${YELLOW}  ⚠ 已终止 code-server (PID: $CODE_SERVER_PID)${NC}"
    fi
    exit 1
fi

# 保存 PID 供 stop 脚本使用
echo "$CODE_SERVER_PID" > "$SCRIPT_DIR/.code-server.pid"
echo "$WEB_PID" > "$SCRIPT_DIR/.web-server.pid"

# ─────────────────────────────────────────────
# 完成
# ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ 全部服务已启动                           ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   🌐 请在浏览器中打开:                         ║${NC}"
echo -e "${GREEN}║   ${CYAN}http://localhost:3000${GREEN}                       ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   code-server 直连:                           ║${NC}"
echo -e "${GREEN}║   ${CYAN}http://localhost:8080${GREEN}                       ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   停止服务:                                   ║${NC}"
echo -e "${GREEN}║   ${CYAN}./stop.sh${GREEN}                                   ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"

# 等待任意一个后台进程退出后清理
wait -n 2>/dev/null || true
echo ""
echo -e "${YELLOW}[注意] 某个服务已退出。运行 ./stop.sh 清理残留进程。${NC}"