# Changelog

## [0.1.0] - 2026-08-15
### Added
- DSH 启动时自动拉起 Ollama（探测 11434 端口）
- Ollama 安装路径自动探测（配置、D:\Ollama、LOCALAPPDATA、Program Files、PATH）
- `spawn('error')` 事件监听 —— 找不到 ollama.exe 时仅告警，**绝不导致 DSH 崩溃**
- DSH 关闭时 `taskkill /IM ollama.exe`（`killOnExit`，默认开启）
- 不杀桌面 UI（`ollama app.exe` 是不同进程名）
