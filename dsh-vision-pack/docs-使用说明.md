# 本地视觉模型使用说明（Ollama + Qwen2.5-VL 7B）

## 已安装内容
- **Ollama**（模型运行器）安装在 `D:\Ollama`，模型文件存在 `D:\Ollama\models`（C 盘零负担）
- **Qwen2.5-VL 7B**：免费开源的视觉语言模型（Q4_K_M 量化，6GB），本地构建，已实测：识别形状/颜色/中英文 OCR 全部正常，热调用约 4 秒
- 已在 DSH 中注册为 provider：`ollama` → 模型 `qwen2.5vl:7b`（设置文件 `C:\Users\Lenovo\.dsh\settings.yaml`）

## 🆕 Ollama 现在跟随 DSH 一起启停（2026-08-15 起）
- **DSH 启动 → Ollama 自动启动**（无需手动操作，也无需开机自启）
- **DSH 关闭 → Ollama 自动关闭**（不留后台进程，省内存）
- 由 `ollama-lifecycle` 插件托管：源码在 `D:\dsh-plugins\ollama-lifecycle`，通过 `cordis.patch.yml` 注册
- 行为细节：DSH 启动时若检测到 Ollama 已在运行（比如你手动开的），不会重复启动；只有 DSH 自己拉起的 Ollama 才会在 DSH 关闭时一起关掉。如果 DSH 是**强制杀进程**退出的（任务管理器结束任务），Ollama 可能残留，手动 `taskkill /IM ollama.exe /F` 即可

## 重启电脑后怎么用
1. 双击桌面 **`DeepSeek Harness`** 快捷方式启动 DSH
2. Ollama 会被自动拉起，`analyze_image` 工具自动加载，无需任何手动操作

## 用法一：直接把图片拖进对话框（视觉模型当会话模型）
1. 点击对话框上方的**模型选择器**，切换到 **`Qwen2.5-VL 7B（视觉）`**（在 "Ollama 本地视觉模型" 分组下）
2. 把图片拖进输入框 / 点附件按钮选择图片，发送
3. 视觉模型会直接"看到"图片并回答
> 注意：会话里一旦有图片，就**不能切回** DeepSeek（DeepSeek 是纯文本模型，不支持图片）——这是 DSH 的能力门控。要看图就用视觉模型开新会话，纯文字工作再用 DeepSeek。

## 用法二：让 DeepSeek 当大脑，视觉模型当"眼睛"（analyze_image 工具）★ 推荐
1. 保持会话模型为 DeepSeek（默认，不用切换）
2. 把图片文件拖进左侧工作区（或告诉我图片的任意路径）
3. 说"分析一下 xxx.png"，我会直接调用 `analyze_image` 工具：视觉模型描述图片 → 我再分析 → 给你结果
> 这种方式图片不进对话上下文，随时可以切回任何模型。

## 常见问题
- **"Model ... does not support image input"**：当前会话模型是 DeepSeek，请切到视觉模型（用法一）或给我文件路径（用法二）
- **Ollama 没在运行**：开始菜单搜索 "Ollama" 打开，或运行 `D:\Ollama\ollama.exe serve`
- **想调整显存/速度**：Ollama 默认上下文 4096 tokens；可用 `setx OLLAMA_CONTEXT_LENGTH 32768` 后重启 Ollama 提升上下文（会更占内存）
- **测试图片**：`D:\vision-test.png`（红圆+蓝方块+中文文字），可用来验证模型是否正常

## 架构备注
- settings.yaml 里 `llm-pi-ai.providers.ollama` 注册了 OpenAI 兼容路由（`http://127.0.0.1:11434/v1`），`input: [text, image]` 声明了图片能力
- `analyze_image` 是自定义工具插件：源码在 `D:\dsh-plugins\tool-analyze-image`，通过 profile `cordis.patch.yml` 注册
- 模型由官方 GGUF（Qwen2.5-VL-7B-Instruct-Q4_K_M + mmproj-F16）本地构建，与官方仓库版本一致；构建完的模型在 `D:\Ollama\models`，GGUF 源文件已删除以省空间
