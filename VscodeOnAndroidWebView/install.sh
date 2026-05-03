#!/bin/bash
# ============================================================
#  VSCode Server on Termux — 一键安装脚本
#  用法：在 Termux 中执行 bash install.sh
# ============================================================

set -e

SCRIPT_DIR="$HOME/.termux/tasker"
BRIDGE_PORT="9000"

echo "=============================================="
echo " VSCode Server on Termux — 安装向导"
echo "=============================================="
echo ""

# 检查 Termux 环境
if [ -z "$TERMUX_VERSION" ] && [ ! -d "/data/data/com.termux" ]; then
  echo "⚠️  警告：当前似乎不在 Termux 环境中。"
  echo "   请确保在 Termux App 内运行此脚本。"
  exit 1
fi

# 检查 Python（桥接服务依赖）
if ! command -v python3 &> /dev/null; then
  echo "📦 安装 Python（桥接服务依赖）..."
  pkg install -y python
fi

# 创建脚本目录
if [ ! -d "$SCRIPT_DIR" ]; then
  echo "📁 创建脚本目录：$SCRIPT_DIR"
  mkdir -p "$SCRIPT_DIR"
fi

# ============================================================
#  脚本1：启动 VSCode Server
# ============================================================
START_VSCODE="$SCRIPT_DIR/start-vscode.sh"
echo "📝 写入启动脚本：$START_VSCODE"
cat > "$START_VSCODE" << 'SCRIPT_EOF'
#!/data/data/com.termux/files/usr/bin/bash
# 在 alpine 容器中启动 code-server

# 避免重复启动：如果已经有一个 code-server 在运行则跳过
if pgrep -f "code serve-web" > /dev/null 2>&1; then
  echo "[$(date '+%H:%M:%S')] code-server 已在运行"
  exit 0
fi

# 等待 Termux 唤醒
sleep 2

# 启动 alpine 并运行 code-server
pd sh alpine --isolated \
  --bind /data/data/com.termux:/termux \
  --bind ~:/home/termux \
  --bind /storage/emulated/0:/sdcard \
  -- code serve-web --host '0.0.0.0' --without-connection-token &

echo "[$(date '+%H:%M:%S')] code-server 启动中..."
SCRIPT_EOF
chmod +x "$START_VSCODE"

# ============================================================
#  脚本2：HTTP 桥接服务（Python 实现）
# ============================================================
BRIDGE_SERVER="$SCRIPT_DIR/bridge-server.py"
echo "📝 写入桥接服务：$BRIDGE_SERVER"
cat > "$BRIDGE_SERVER" << 'BRIDGE_EOF'
#!/data/data/com.termux/files/usr/bin/env python3
"""
bridge-server.py — 极简 HTTP 桥接服务
监听 localhost:9000，接收网页 fetch 请求并触发 start-vscode.sh
"""

import json
import subprocess
import sys
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

START_SCRIPT = str(Path.home() / ".termux" / "tasker" / "start-vscode.sh")
PORT = 9000


class BridgeHandler(BaseHTTPRequestHandler):
    """处理来自网页的 HTTP 请求"""

    def do_GET(self):
        path = self.path.split("?")[0]

        if path == "/start":
            subprocess.Popen(
                ["bash", START_SCRIPT],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self._reply(200, {"status": "ok", "message": "code-server \u6b63\u5728\u542f\u52a8"})

        elif path == "/ping":
            self._reply(200, {"status": "ok", "message": "bridge server is running"})

        elif path == "/":
            self._reply(200, {
                "status": "ok",
                "message": "bridge server is running",
                "endpoints": ["/start", "/ping"],
            })

        else:
            self._reply(404, {"status": "error", "message": "not found"})

    def _reply(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """CORS 预检请求"""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, fmt, *args):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {fmt % args}", flush=True)


def main():
    # 避免重复启动
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.connect(("127.0.0.1", PORT))
        s.close()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 桥接服务已在运行")
        sys.exit(0)
    except ConnectionRefusedError:
        pass
    finally:
        s.close()

    print(f"[{datetime.now().strftime('%H:%M:%S')}] 桥接服务启动，监听端口 {PORT}")
    print("   现在可以用浏览器打开页面并点击「启动 VSCode Server」按钮了")

    server = HTTPServer(("127.0.0.1", PORT), BridgeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n桥接服务已停止")
        server.server_close()


if __name__ == "__main__":
    main()
BRIDGE_EOF
chmod +x "$BRIDGE_SERVER"

echo ""
echo "=============================================="
echo " ✅ 安装完成！"
echo "=============================================="
echo ""
echo "  📋 使用步骤："
echo ""
echo "  Step 1 — 启动桥接服务（Termux 中执行）："
echo "    python3 $BRIDGE_SERVER"
echo ""
echo "    建议加到 ~/.bashrc 中实现 Termux 启动时自动运行："
echo "    echo 'python3 $BRIDGE_SERVER &' >> ~/.bashrc"
echo ""
echo "  Step 2 — 打开浏览器访问："
echo "    https://hab1na.github.io/VscodeOnAndroidWebView/"
echo ""
echo "  Step 3 — 点击「启动 VSCode Server」按钮"
echo "    页面会通过 localhost:9000 通知桥接服务启动 code-server"
echo ""
echo "  ⚡ 提示：如果自动启动失败，也可在 Termux 中手动执行："
echo "    bash $START_VSCODE"
echo ""
