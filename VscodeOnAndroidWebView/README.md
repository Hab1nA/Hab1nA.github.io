# 🚀 VSCode Server on Android

在 Android 平板上通过 Termux 运行 **code-server**，配合本地网页仪表板，让你在浏览器中使用完整 VSCode 进行开发。

## 📁 文件说明

| 文件 | 用途 |
|------|------|
| `setup.sh` | 一次性安装脚本：安装 Node.js、Python、Git 等依赖，并部署 code-server |
| `start.sh` | 启动脚本：同时启动 code-server（端口 `8080`）和网页仪表板（端口 `3000`） |
| `stop.sh` | 停止脚本：终止所有后台服务 |
| `index.html` | 网页仪表板：暗色主题，内嵌 iframe 显示 VSCode，带健康检测和自动重连 |

## 📋 前置条件

1. **安装 Termux**  
   从 [F-Droid](https://f-droid.org/packages/com.termux/) 下载安装（不要使用 Google Play 版本，已停更）。

2. **授予存储权限**  
   打开 Termux，执行：
   ```bash
   termux-setup-storage
   ```
   在弹出的权限对话框中点"允许"。

3. **将本项目文件复制到平板**  
   将 `VscodeOnAndroidWebView/` 文件夹放到平板 `Download` 目录下（Android 原生路径为 `/storage/emulated/0/Download/`，Termux 中对应 `~/storage/downloads/`，两者指向同一位置）：
   ```
   /storage/emulated/0/Download/VscodeOnAndroidWebView/
   ```

## 🛠️ 使用方法

### 第一步：安装（仅需一次）

```bash
# 进入项目目录
cd ~/storage/downloads/VscodeOnAndroidWebView

# 赋予脚本执行权限
chmod +x setup.sh start.sh stop.sh

# 运行安装脚本（需要网络连接，约 5-10 分钟）
./setup.sh
```

安装脚本会自动：
- 更新 Termux 软件源
- 安装 `nodejs-lts`、`python`、`git`、`curl`、`tar`
- 通过 npm 安装 code-server（如失败则下载 ARM64 预编译包）
- 创建配置文件 `~/.config/code-server/config.yaml`

### 第二步：启动（每次使用）

```bash
cd ~/storage/downloads/VscodeOnAndroidWebView
./start.sh
```

### 第三步：打开浏览器

在平板浏览器地址栏输入：

```
http://localhost:3000
```

你将看到仪表板页面，自动检测 code-server 并在就绪后加载 VSCode 界面。

### 停止服务

```bash
cd ~/storage/downloads/VscodeOnAndroidWebView
./stop.sh
```

## 🎨 仪表板功能

- **状态指示灯**：绿点（在线）/ 红点（离线）/ 黄点脉冲（检测中）
- **自动检测**：每 2 秒轮询 code-server，就绪后自动加载
- **超时提示**：超过 60 秒未响应时显示离线提示
- **刷新按钮**：手动重新连接 VSCode
- **新窗口按钮**：在新标签页直接打开 code-server
- **底部状态栏**：显示当前连接状态
- **Ctrl+R**：键盘快捷键刷新 VSCode

## ⚙️ 配置说明

code-server 默认配置（`~/.config/code-server/config.yaml`）：
```yaml
bind-addr: 127.0.0.1:8080   # 仅本地访问
auth: none                    # 无密码（仅本地使用安全）
cert: false                   # 不使用 HTTPS
```

> ⚠️ **安全提示**：`auth: none` 意味着任何能访问 `localhost:8080` 的应用都可以操作 VSCode。由于绑定在 `127.0.0.1`，仅本机可访问，在个人平板上使用是安全的。如果你需要通过局域网其他设备访问，请修改为 `bind-addr: 0.0.0.0:8080` 并设置密码。

## 🔧 常见问题

### Q: setup.sh 提示 "请在 Termux 环境中运行"
**A:** 请确保你在 Termux 应用中执行脚本，而不是其他终端模拟器。

### Q: npm install -g code-server 失败
**A:** 脚本会自动尝试下载 ARM64 预编译包。如果也失败，请检查网络连接。也可以手动安装：
```bash
npm install -g code-server
```

### Q: 浏览器打开 localhost:3000 显示空白
**A:** 确认 `start.sh` 正在 Termux 中运行，且没有报错。检查：
```bash
# 查看 code-server 错误日志
cat ~/.code-server-error.log

# 查看网页服务器错误日志
cat ~/.web-server-error.log
```

### Q: iframe 中 VSCode 显示不正常
**A:** 点击"新窗口"按钮直接访问 `http://localhost:8080`。部分 code-server 版本可能限制 iframe 嵌套。

### Q: Termux 被系统杀后台
**A:** 
1. 在系统设置中将 Termux 的电池优化设为"不优化"
2. 关闭 Termux 的电池优化：设置 → 应用 → Termux → 电池 → 无限制
3. 在 Termux 中安装 Termux:Boot 并设置开机自启（高级）

### Q: 如何安装 VSCode 扩展？
**A:** 在 VSCode 界面中按 `Ctrl+Shift+X` 打开扩展市场，搜索并安装。推荐安装：
- **中文语言包**：搜索 `Chinese`
- **Python**：搜索 `Python`
- **GitLens**：Git 增强工具

## 📦 技术栈

- **code-server**: [coder/code-server](https://github.com/coder/code-server) — 在浏览器中运行 VSCode
- **Termux**: Android 终端模拟器与 Linux 环境
- **Python HTTP Server**: 提供本地网页仪表板
- **Vanilla JS**: 无框架，纯原生实现仪表板

## 📄 License


