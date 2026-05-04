#!/data/data/com.termux/files/usr/bin/bash
#
# VSCode Server on Android (Termux) - 安装脚本
# 用法: chmod +x setup.sh && ./setup.sh
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║   VSCode Server on Android - 安装程序        ║"
echo "║   Termux + code-server                      ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────
# 1. 环境检测
# ─────────────────────────────────────────────
if [ ! -d "/data/data/com.termux" ]; then
    echo -e "${RED}[错误] 请在 Termux 环境中运行此脚本${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/5] 正在更新 Termux 软件源...${NC}"
pkg update -y || true
pkg upgrade -y || true

# ─────────────────────────────────────────────
# 2. 安装基础依赖
# ─────────────────────────────────────────────
echo -e "${YELLOW}[2/5] 正在安装基础依赖...${NC}"
# psmisc 提供 fuser/pkill，Android 10+ 需要；若仓库缺包则忽略
pkg install -y nodejs-lts python git curl tar openssl-tool iproute2 psmisc 2>/dev/null || \
pkg install -y nodejs-lts python git curl tar openssl-tool iproute2 || true

echo -e "${GREEN}  ✓ Node.js: $(node --version)${NC}"
echo -e "${GREEN}  ✓ npm:     $(npm --version)${NC}"
echo -e "${GREEN}  ✓ Python:  $(python --version 2>&1)${NC}"
echo -e "${GREEN}  ✓ Git:     $(git --version 2>&1 | head -1)${NC}"
echo -e "${GREEN}  ✓ curl:    $(curl --version 2>&1 | head -1)${NC}"
echo -e "${GREEN}  ✓ tar:     $(tar --version 2>&1 | head -1)${NC}"

# ─────────────────────────────────────────────
# 3. 尝试通过 npm 安装 code-server
# ─────────────────────────────────────────────
echo -e "${YELLOW}[3/5] 正在通过 npm 安装 code-server...${NC}"

CODE_SERVER_INSTALLED=false

if npm install -g code-server 2>"$HOME/.npm-install.log"; then
    CODE_SERVER_INSTALLED=true
    echo -e "${GREEN}  ✓ code-server (npm) 安装成功${NC}"
else
    echo -e "${YELLOW}  ⚠ npm 安装失败，尝试下载预编译二进制包...${NC}"
fi

# ─────────────────────────────────────────────
# 4. 备选方案：下载预编译 ARM64 二进制包
# ─────────────────────────────────────────────
if [ "$CODE_SERVER_INSTALLED" = false ]; then
    echo -e "${YELLOW}[4/5] 正在下载 code-server 预编译包 (ARM64)...${NC}"

    # 尝试获取最新版本号
    echo -e "${YELLOW}  正在查询最新版本...${NC}"
    LATEST_VERSION=$(curl -fsSL --connect-timeout 10 https://api.github.com/repos/coder/code-server/releases/latest 2>/dev/null | grep -o '"tag_name": *"v[^"]*"' | grep -o 'v[0-9.]*' | sed 's/^v//' | head -1)
    if [ -n "$LATEST_VERSION" ]; then
        CODE_SERVER_VERSION="$LATEST_VERSION"
        echo -e "${GREEN}  ✓ 最新版本: v${CODE_SERVER_VERSION}${NC}"
    else
        CODE_SERVER_VERSION="4.99.2"
        echo -e "${YELLOW}  ⚠ 无法获取最新版本，回退到 v${CODE_SERVER_VERSION}${NC}"
    fi

    DOWNLOAD_URL="https://github.com/coder/code-server/releases/download/v${CODE_SERVER_VERSION}/code-server-${CODE_SERVER_VERSION}-linux-arm64.tar.gz"
    INSTALL_DIR="$HOME/.local"
    mkdir -p "$INSTALL_DIR"

    cd /tmp || { echo -e "${RED}  ✗ 无法进入 /tmp 目录${NC}"; exit 1; }
    echo -e "${CYAN}  下载地址: $DOWNLOAD_URL${NC}"

    if curl -fSL --connect-timeout 15 --max-time 300 --progress-bar -o code-server.tar.gz "$DOWNLOAD_URL"; then
        echo -e "${CYAN}  正在解压...${NC}"
        if ! tar -xzf code-server.tar.gz; then
            echo -e "${RED}  ✗ 解压失败，文件可能已损坏。请重试。${NC}"
            rm -f code-server.tar.gz
            exit 1
        fi
        TAR_DIR="code-server-${CODE_SERVER_VERSION}-linux-arm64"
        if [ ! -d "$TAR_DIR" ]; then
            echo -e "${RED}  ✗ 解压目录 $TAR_DIR 不存在，版本号可能不匹配。${NC}"
            echo -e "${YELLOW}  实际解压内容:$(ls -d code-server-* 2>/dev/null || echo ' 无')${NC}"
            # 清理残留：删除压缩包和所有解压出的目录
            rm -f code-server.tar.gz
            rm -rf code-server-*/
            exit 1
        fi
        cp -r "$TAR_DIR"/* "$INSTALL_DIR/"
        if [ -f "$INSTALL_DIR/bin/code-server" ]; then
            chmod +x "$INSTALL_DIR/bin/code-server"
        else
            echo -e "${RED}  ✗ 未找到 $INSTALL_DIR/bin/code-server，tar 结构可能已变化。${NC}"
            echo -e "${YELLOW}  列出已安装文件:$(ls "$INSTALL_DIR/bin/" 2>/dev/null || echo ' bin/ 不存在')${NC}"
            rm -rf code-server.tar.gz "$TAR_DIR"
            exit 1
        fi
        rm -rf code-server.tar.gz "$TAR_DIR"
        CODE_SERVER_INSTALLED=true
        echo -e "${GREEN}  ✓ code-server (binary) 安装成功${NC}"
    else
        echo -e "${RED}  ✗ 下载失败。请检查网络连接后重试。${NC}"
        echo -e "${YELLOW}  你可以稍后手动执行: npm install -g code-server${NC}"
    fi
fi

# 确保 PATH 包含 code-server
if ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi
export PATH="$HOME/.local/bin:$PATH"

# ─────────────────────────────────────────────
# 5. 创建 code-server 配置文件
# ─────────────────────────────────────────────
echo -e "${YELLOW}[5/5] 正在创建 code-server 配置文件...${NC}"

CONFIG_DIR="$HOME/.config/code-server"
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_DIR/config.yaml" << 'YAML'
bind-addr: 127.0.0.1:8080
auth: none
cert: false
YAML

echo -e "${GREEN}  ✓ 配置文件: $CONFIG_DIR/config.yaml${NC}"

# ─────────────────────────────────────────────
# 6. 验证安装
# ─────────────────────────────────────────────
echo -e "${YELLOW}[验证] 检查 code-server 是否可用...${NC}"
export PATH="$HOME/.local/bin:$PATH"
if command -v code-server &>/dev/null; then
    CODE_SERVER_VER=$(code-server --version 2>&1 | head -1 || echo "未知")
    echo -e "${GREEN}  ✓ code-server 已就绪: $CODE_SERVER_VER${NC}"
else
    echo -e "${RED}  ✗ code-server 似乎未正确安装${NC}"
    echo -e "${YELLOW}  请检查错误日志后重试${NC}"
fi

# ─────────────────────────────────────────────
# 完成
# ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ 安装完成！                              ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   启动 VSCode:                                ║${NC}"
echo -e "${GREEN}║   ${CYAN}进入 VscodeOnAndroidWebView 目录${GREEN}          ║${NC}"
echo -e "${GREEN}║   ${CYAN}./start.sh${GREEN}                                  ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   然后在浏览器访问:                            ║${NC}"
echo -e "${GREEN}║   ${CYAN}http://localhost:3000${GREEN}                       ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"