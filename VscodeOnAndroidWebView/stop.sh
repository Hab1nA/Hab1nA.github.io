#!/data/data/com.termux/files/usr/bin/bash
#
# VSCode Server on Android (Termux) - 停止脚本
# 用法: ./stop.sh
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║   🛑 正在停止所有服务...                       ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────
# 通过 PID 文件优雅终止进程（先 TERM，1 秒后仍存活再 KILL）
# ─────────────────────────────────────────────
graceful_kill() {
    local pid=$1
    local name=$2
    if kill -0 "$pid" 2>/dev/null; then
        kill -TERM "$pid" 2>/dev/null
        sleep 1
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null
        fi
        echo -e "${GREEN}  ✓ 已终止 ${name} (PID: $pid)${NC}"
        return 0
    fi
    return 1
}

if [ -f "$SCRIPT_DIR/.code-server.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/.code-server.pid")
    graceful_kill "$PID" "code-server" || true
    rm -f "$SCRIPT_DIR/.code-server.pid"
fi

if [ -f "$SCRIPT_DIR/.web-server.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/.web-server.pid")
    graceful_kill "$PID" "网页服务器" || true
    rm -f "$SCRIPT_DIR/.web-server.pid"
fi

# ─────────────────────────────────────────────
# 兜底：通过端口号强制终止
# ─────────────────────────────────────────────
kill_port() {
    local port=$1
    local pid
    # Android 10+ 限制 ss -tlnp 获取 PID，同时尝试 fuser
    pid=$(ss -tlnp 2>/dev/null | grep ":${port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
    if [ -z "$pid" ] || ! [ "$pid" -gt 0 ] 2>/dev/null; then
        # 备选：fuser (Android 10+ 仍可用)
        pid=$(fuser ${port}/tcp 2>/dev/null | awk '{print $NF}' | tr -d ' ')
    fi
    if [ -n "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null; then
        kill -TERM "$pid" 2>/dev/null
        sleep 1
        kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null
        echo -e "  ${GREEN}✓ 已清理端口 ${port} (PID: ${pid})${NC}"
    fi
}

kill_port 8080
kill_port 3000

echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ 所有服务已停止                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"