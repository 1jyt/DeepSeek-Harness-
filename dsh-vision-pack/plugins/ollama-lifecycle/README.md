# ollama-lifecycle

DSH 辅助插件：让本地 Ollama 服务跟随 DSH 一起启动、一起关闭。

## 功能
- DSH 启动时探测 `http://127.0.0.1:11434`，未运行则自动拉起 `ollama serve`
- 自动探测 Ollama 安装路径（配置 → `D:\Ollama` → `%LOCALAPPDATA%\Programs\Ollama` → Program Files → PATH）
- DSH 关闭时自动 `taskkill` 清理（不杀桌面 UI `ollama app.exe`）
- 崩溃防护：`spawn` 的 `'error'` 事件已监听 —— 即使找不到 Ollama 也**不会拖垮 DSH**

## 版本

| 版本 | 说明 |
|---|---|
| 0.1.0 | 初始版（路径自动探测 + spawn error 防崩溃 + killOnExit） |

详见 `CHANGELOG.md`。

## 配置（可选）
`cordis.patch.yml` 中可设置 `ollamaPath` / `baseUrl` / `readyTimeoutMs` / `killOnExit`，省略则用默认值。
