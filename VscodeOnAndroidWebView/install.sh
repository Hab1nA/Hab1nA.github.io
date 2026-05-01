#!/bin/bash
# ============================================================
#  VSCode Server on Termux — 一键安装脚本
#  用法：在 Termux 中执行 bash install.sh
# ============================================================

set -e

TASKER_DIR="$HOME/.termux/tasker"
SCRIPT_NAME="start-vscode.sh"
TARGET="$TASKER_DIR/$SCRIPT_NAME"

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

# 创建 Termux:Tasker 脚本目录
if [ ! -d "$TASKER_DIR" ]; then
  echo "📁 创建脚本目录：$TASKER_DIR"
  mkdir -p "$TASKER_DIR"
fi

# 写入启动脚本
echo "📝 写入启动脚本：$TARGET"
cat > "$TARGET" << 'SCRIPT_EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Termux:Tasker VSCode 启动脚本
# 在 alpine 容器中启动 code-server

# 等待 Termux 唤醒
sleep 2

# 启动 alpine 并运行 code-server
pd sh alpine --isolated \
  --bind /data/data/com.termux:/termux \
  --bind ~:/home/termux \
  --bind /storage/emulated/0:/sdcard \
  -- code serve-web --host '0.0.0.0' --without-connection-token
SCRIPT_EOF

# 赋予执行权限
chmod +x "$TARGET"

echo ""
echo "=============================================="
echo " ✅ 安装完成！"
echo "=============================================="
echo ""
echo "  📋 后续步骤："
echo ""
echo "  1. 安装 Termux:Tasker 插件"
echo "     F-Droid: https://f-droid.org/packages/com.termux.tasker/"
echo ""
echo "  2. 打开浏览器访问你的托管页面："
echo "     https://hab1na.github.io/VscodeOnAndroidWebView/"
echo ""
echo "  3. 点击页面上的「启动 VSCode Server」按钮"
echo "     浏览器会通过 Intent 调用 Termux:Tasker 执行此脚本"
echo ""
echo "  ⚡ 提示：如果自动启动失败，也可在 Termux 中手动执行："
echo "     bash $TARGET"
echo ""
echo "  或直接执行原始命令："
echo "     pd sh alpine --isolated \\"
echo "       --bind /data/data/com.termux:/termux \\"
echo "       --bind ~:/home/termux \\"
echo "       --bind /storage/emulated/0:/sdcard \\"
echo "       -- code serve-web --host '0.0.0.0' --without-connection-token"
echo ""