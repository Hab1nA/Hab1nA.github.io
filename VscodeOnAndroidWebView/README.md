# 🖥️ VSCode Server on Android

在安卓手机上通过浏览器一键启动 VSCode Server，无需每次手动在 Termux 中输入命令。

## 工作原理

```
┌──────────────┐    Intent URI     ┌────────────────┐    Shell     ┌─────────────┐
│  浏览器页面   │ ────────────────→ │ Termux:Tasker   │ ──────────→ │  Termux     │
│  (本工程)     │                   │  (插件)         │             │  (alpine)   │
└──────┬───────┘                   └────────────────┘             └──────┬──────┘
       │                                                                  │
       │                    http://localhost:8000                         │
       └─────────────────────────────────────────────────────────────────┘
                              VSCode Server
```

## 前置要求

| 项目 | 说明 |
|------|------|
| Termux | Android 终端模拟器 |
| Termux:Tasker | Termux 插件，允许外部 App 触发 Termux 命令 |
| code-server | 在 alpine 容器中已安装的 code-server |

## 一次性配置

### 1. 安装 Termux:Tasker

从 F-Droid 下载安装：
- [Termux:Tasker on F-Droid](https://f-droid.org/packages/com.termux.tasker/)

> ⚠️ Google Play 上的 Termux 和 Termux:Tasker 已不再更新，请使用 F-Droid 版本。

### 2. 运行安装脚本

在 Termux 中执行以下命令：

```bash
# 下载安装脚本
curl -o install.sh https://raw.githubusercontent.com/Hab1nA/Hab1nA.github.io/main/VscodeOnAndroidWebView/install.sh

# 运行安装
bash install.sh
```

脚本会在 `~/.termux/tasker/` 目录下创建 `start-vscode.sh`，这就是 Termux:Tasker 将调用的启动脚本。

### 3. 授予 Termux:Tasker 后台运行权限

首次使用时，Android 系统会弹出权限请求，请允许 Termux:Tasker 在后台运行。

## 日常使用

1. 在安卓浏览器中打开：
   ```
   https://hab1na.github.io/VscodeOnAndroidWebView/
   ```

2. 点击页面上的 **「🚀 启动 VSCode Server」** 按钮

3. 浏览器会自动：
   - 通过 Android Intent 触发 Termux:Tasker
   - Termux:Tasker 在后台执行启动脚本
   - 页面轮询检测服务就绪后，自动加载 VSCode 界面

4. 开始使用 VSCode！

## 故障排查

### 点击按钮没反应？

请确认已安装 **Termux:Tasker** 插件。如果仍无法自动启动，可在 Termux 中手动执行：

```bash
bash ~/.termux/tasker/start-vscode.sh
```

然后在浏览器中刷新页面，页面会自动检测到已运行的服务。

### 页面显示"连接被拒绝"？

确保 code-server 已在 Termux/alpine 中正确安装：

```bash
pd sh alpine --isolated -- which code
```

### 连接超时？

启动 alpine 容器 + code-server 需要一定时间（通常 5-15 秒），页面会自动等待最多 60 秒。

## 技术细节

- **Intent URI**: 页面使用 `intent://` scheme 调用 `com.termux.tasker.RUN_COMMAND`
- **轮询检测**: 使用 `fetch` + `Image` 探针检测 `localhost:8000` 是否就绪
- **iframe 嵌入**: VSCode 界面通过 `<iframe>` 嵌入，支持剪贴板读写
- **纯静态页面**: 无需后端服务，通过 GitHub Pages 直接托管

## 许可

MIT