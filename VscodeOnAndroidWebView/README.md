# VSCode Server on Android

在安卓手机/平板浏览器中运行完整的 VSCode 编辑器。

## 原理

```
┌──────────────┐   fetch localhost:9000/start  ┌─────────────────┐
│  浏览器页面   │ ─────────────────────────────→ │  bridge-server   │
│  (任意浏览器)  │                               │  (Termux netcat)  │
└──────┬───────┘                               └────────┬────────┘
       │                                                │
       │                                                ▼ bash
       │                                        ┌─────────────────┐
       │                                        │  start-vscode.sh │
       │                                        └────────┬────────┘
       │                                                 │ pd sh alpine
       │                                                 ▼
       │              localhost:8000             ╔═════════════════╗
       └────────────────────────────────────────→║   code-server    ║
                                                 ╚═════════════════╝
```

浏览器页面通过 HTTP 请求本机 `localhost:9000`（桥接服务）来触发启动，不再依赖 Android Intent，无需安装 Termux:Tasker。

## 前置条件

- Termux（从 F-Droid 安装）
- Termux 中已安装 `pd`（proot-distro）和 `alpine`
- alpine 中已安装 `code-server`

## 安装步骤

### 1. 在 Termux 中运行安装脚本

```bash
curl -o install.sh https://raw.githubusercontent.com/Hab1nA/Hab1nA.github.io/main/VscodeOnAndroidWebView/install.sh
bash install.sh
```

该脚本会部署两个文件：
- `~/.termux/tasker/start-vscode.sh` — code-server 启动脚本
- `~/.termux/tasker/bridge-server.py` — HTTP 桥接服务（Python）

### 2. 启动桥接服务

```bash
python3 ~/.termux/tasker/bridge-server.py
```

**推荐设为 Termux 开机自启：**

```bash
echo 'python3 ~/.termux/tasker/bridge-server.py &' >> ~/.bashrc
```

### 3. 打开浏览器访问

```
https://hab1na.github.io/VscodeOnAndroidWebView/
```

点击页面上「🚀 启动 VSCode Server」按钮即可。

## 手动启动（备选）

如果桥接服务不可用，可以在 Termux 中直接执行：

```bash
bash ~/.termux/tasker/start-vscode.sh
```

页面支持热检测，已运行中的 code-server 会被自动发现并连接。

## FAQ

**Q: 桥接服务无法连接？**  
A: 确保已在 Termux 中执行 `python3 ~/.termux/tasker/bridge-server.py`，然后刷新浏览器页面。

**Q: code-server 启动超时？**  
A: 检查 `pd sh alpine` 是否正常工作，在 Termux 中手动执行命令排查。

**Q: iframe 拒绝连接？**  
A: `--host '0.0.0.0'` 和 `--without-connection-token` 是必需的，不要去掉。