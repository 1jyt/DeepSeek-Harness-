# Changelog

## [0.1.0] - 2026-08-15
### Added
- vision-bridge：`llm/stream` 全局监听（`{ global: true }`），图片自动转本地视觉模型文字分析
- 同步函数 + async generator 实现（兼容 Cordis waterfall 语义，`next()` 不透传参数，改用 `llm.adapterStream` 直连）
- `analyze_image` 模型工具（相对/绝对路径解析，cwd + workspaceRoot）
- 多轮优化：只分析最新含图消息，历史图片占位
- 请求 `keep_alive: -1`（模型常驻显存，热调用 ~4s）
- 千问 prompt 输出"可搜索特征关键词"，并指示 DeepSeek 必要时用 `web_search` 联网确认
- 注入文本明确"这是用户上传图片，勿再读其他文件"
- 稳健性：`ctx.get('llm')` 可选服务、全链路 try/catch、替换后冻结消息
