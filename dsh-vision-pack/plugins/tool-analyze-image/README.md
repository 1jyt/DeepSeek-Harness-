# tool-analyze-image

DSH 视觉插件：让 DeepSeek（纯文本模型）也能"看图"。

## 功能
- **vision-bridge**：监听 `llm/stream`（`{ global: true }` 跨作用域），对话含图片且目标模型不支持图片时，把图片交给本地 Ollama 视觉模型（Qwen2.5-VL）分析成文字，替换后经 `llm.adapterStream` 直连适配器 —— 图片永不进入 DeepSeek 上下文。
- **`analyze_image` 工具**：模型可主动调用，按 `file_path` 分析任意图片（OCR、物体、场景、角色特征等）。

## 版本

| 版本 | 说明 |
|---|---|
| 0.1.0 | 初始版（含所有修复：global 监听、async generator + adapterStream、keep_alive 常驻、联网搜索特征指示、防误读文件指示） |

详见 `CHANGELOG.md`。

## 安装
见仓库根目录 `README.md` 的部署步骤（推荐用 `scripts/deploy.ps1`）。
