# DSH 本地视觉方案（Vision Bridge + analyze_image + Ollama 生命周期托管）

> **项目一句话**：让 DeepSeek 这类纯文本模型也能"看图"——用户把图片拖进 DSH 对话框提问，系统自动调用**本地免费视觉模型**（Qwen2.5-VL / Ollama）把图片转成文字分析，再把"分析结果 + 用户问题"一起交给 DeepSeek 作答。图片不进入 DeepSeek 上下文，全程本地推理，零 API 费用。

---

## 🧭 给 AI / DeepSeek 读者的快速导航（请先读这一段）

你是一个 AI agent，被要求维护、部署或审查这个项目。请按以下顺序理解：

1. **这是什么**：DSH（DeepSeek Harness）的插件组合，解决"纯文本模型无法直接收图片"的问题。核心是 `tool-analyze-image` 插件里的 **vision-bridge**。
2. **核心机制（一句话）**：监听 DSH 的 `llm/stream` 事件（带 `{ global: true }`），当请求里含图片块且目标模型不支持图片时，把图片读出来发给本地 Ollama 视觉模型，用返回的文字替换图片块，再直连适配器继续请求。
3. **最重要的三个技术事实**（写代码/排障前必须知道）：
   - `llm/stream` 是 **Cordis waterfall**：监听器必须**同步返回 AsyncIterable**（不能是 async 函数返回 Promise），且 `next()` **不接受参数**（无法通过 `next(newOptions)` 传修改后的消息）。
   - 因此 bridge 返回一个 **async generator**，内部完成图片替换后调用 **`llm.adapterStream(modifiedOptions)`** 绕过 waterfall 直连适配器。
   - 插件用 `{ global: true }` 注册监听，才能收到 LlmRuntime 自己 ctx 上发起的事件。
4. **部署陷阱（极易踩坑）**：DSH profile 的 pnpm 配置是 `nodeLinker: hoisted`，`file:` 依赖是**拷贝安装**。修改 `D:\dsh-plugins\...` 源码后，**必须手动同步到 `node_modules\` 再重启 DSH**，否则改动不生效（这是本项目历史上最隐蔽的坑）。
5. **排障入口**：`scripts/restart-dsh.ps1` 用于重启 web 服务；Ollama 健康检查 `http://127.0.0.1:11434/api/version`；模型 `ollama ps`。

---

## 📁 目录结构（每个文件的作用）

```
ds-vision-release/
├── README.md                          # 本文件（人 + AI 通用）
├── docs-使用说明.md                   # 用户视角的日常使用说明（已安装后的用法）
├── .gitignore                         # 发布到 GitHub 时排除模型/node_modules/日志
├── plugins/
│   ├── tool-analyze-image/            # ★ 核心插件
│   │   ├── package.json               #   插件包元数据（ESM, main=lib/index.js）
│   │   └── lib/index.js               #   vision-bridge + analyze_image 工具（全部逻辑）
│   └── ollama-lifecycle/              # 辅助插件：Ollama 随 DSH 启停
│       ├── package.json
│       └── lib/index.js               #   spawn ollama serve / taskkill 清理
├── config/
│   ├── cordis.patch.yml               # DSH profile 补丁：注册两个插件（含配置）
│   └── settings.example.yaml          # Ollama provider 注册片段（模型选择器显示用）
└── scripts/
    └── restart-dsh.ps1                # 重启 DSH web 服务脚本（带端口轮询）
```

---

## 🔀 架构与数据流

```
用户：图片拖进对话框 + 打字提问
  │
  ▼
DSH agent-loop 构建请求（messages 含 image 块，attachment 为内容寻址引用）
  │
  ▼
LlmRuntime.stream() ──► ctx.waterfall('llm/stream', options, ...)
  │                          │
  │    ┌─────────────────────┼──────────────────────────┐
  │    ▼                     ▼                          ▼
  │  agent-loop invariant  llm invariant            ★ vision-bridge
  │  (prepend, global)     (prepend, global)         (global, 无 prepend)
  │   检查冻结/一致性        验证流                   检测到 image 块
  │                                                   │
  │                                                   ▼
  │                                  是否模型支持图片？resolveModelInfo
  │                                      │是             │否/不确定
  │                                      ▼             ▼
  │                                  yield* next()   async generator 内：
  │                                 （原样透传）      1. attachments.readImage(block.attachment)
  │                                                  2. 千问 visionDescribe（keep_alive:-1）
  │                                                  3. 替换 image 块 → text 块
  │                                                  4. llm.adapterStream(modifiedOptions) ← 绕过 waterfall
  │                                                  5. yield* 适配器流
  │
  ▼
DeepSeek adapter（文本）收到的是纯文本消息 → 正常回复
```

**为什么不能直接 `next(modifiedOptions)`**：Cordis waterfall 的 `next` 只负责调用下游，不接受参数；传入新消息会被忽略，图片依然会到达 DeepSeek 适配器并触发 `UNSUPPORTED_CONTENT` 错误。所以必须用 `llm.adapterStream(modifiedOptions)` 直连。

---

## 🛠 部署步骤（新机器复现）

### 0. 极简操作（小白专用，推荐）★

收到压缩包后，**只需要三步**：

1. **解压** 到任意目录（如 `D:\ds-vision-release`）
2. **双击 `install.bat`**（自动预检 → 自动安装，全程有提示；预检不过会告诉你缺什么）
3. **重启 DeepSeek Harness**（关掉重开）

完成。Ollama 自动跟随 DSH 启动，图片拖进对话框自动走本地千问分析。**不需要手动改任何配置。**

### 前置要求
- Windows 10/11（脚本和路径基于 Windows，其他平台需调整 `ollama-lifecycle` 的进程管理）
- 已安装 DSH（DeepSeek Harness）并**至少成功运行过一次**（保证 profile 已生成）
- Node.js 18+ / pnpm（DSH 自带 node，路径参考 `scripts/restart-dsh.ps1`）

### 1. 安装 Ollama 并拉取视觉模型
```powershell
# 从 https://ollama.com 安装（安装到 D:\Ollama 或默认路径）
ollama pull qwen2.5vl:7b     # 约 5.6GB；显存小可用 qwen2.5vl:3b
ollama list                  # 确认模型存在
```

### 2. 一键部署（推荐，安全）★

在**解压后的完整项目目录**内运行（自动备份、幂等、可回滚）：

```powershell
# 第一步：试运行（只体检，不修改任何东西）—— 全部 [OK] 再继续
powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1 -DryRun

# 第二步：真正安装（备份 → 拷贝插件 → 注册依赖 → pnpm install → 合并 patch）
powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1
```

`-DryRun` 会预检：DSH 是否安装、配置文件是否齐全、node/pnpm 是否可用（自动找 DSH 自带运行时）、插件源码是否完整、目标目录是否可写。**任何一项不过都不会动你的系统**，修好再跑。重复运行安全（幂等），每次改动前自动备份（`*.bak-时间戳`），末尾打印恢复指引。

> 若机器上没有 node/pnpm 在 PATH，deploy 会自动查找 DSH 自带的运行时（`%USERPROFILE%\.cache\codex-runtimes`），无需手动安装。

### 3. 手动部署（不推荐，容易出错）

> 只有你清楚自己在做什么时才用手动方式。**每一步都可能让 DSH 启动失败**，务必先备份以下三个文件：
> `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`、`package.json`、`%USERPROFILE%\.dsh\settings.yaml`

3.1 把 `plugins/` 下两个目录拷贝到 `D:\dsh-plugins\`（**目录必须存在**，否则 pnpm 装不上、DSH 启动即崩）
3.2 编辑 `<DSH_HOME>/profiles/web/package.json`，`dependencies` 加入：
```json
"tool-analyze-image": "file:D:/dsh-plugins/tool-analyze-image",
"ollama-lifecycle": "file:D:/dsh-plugins/ollama-lifecycle"
```
3.3 安装依赖：
```powershell
cd %USERPROFILE%\.dsh\profiles\web
pnpm install
```
3.4 把 `config/cordis.patch.yml` 内容**追加**（不是替换）进 `<DSH_HOME>/profiles/web/cordis.patch.yml`，改 `workspaceRoot`
3.5（可选）把 `config/settings.example.yaml` 中 `ollama` provider 段**合并**（不是替换）进 `<DSH_HOME>/settings.yaml`

### 4. 重启 DSH
```
powershell -ExecutionPolicy Bypass -File .\scripts\restart-dsh.ps1
```
重启后：Ollama 应被自动拉起（`ollama-lifecycle`），插件自动加载。

---

## 🔄 版本更新与维护（版本会保留，更新不丢）

本项目是**正式插件包**：每个插件是带 `package.json`（name + version）的标准 npm 包，随仓库**版本化**（GitHub 建议用 Release/Tag 对应版本号）。更新流程如下：

### 更新插件（保留版本历史）
1. 修改插件源码（如 `plugins/tool-analyze-image/lib/index.js`）
2. **bump 版本**：改该插件 `package.json` 的 `version`（如 `0.1.0` → `0.2.0`），并在其 `CHANGELOG.md` 记录本次改动
3. 重新运行 `deploy.ps1`（会自动把新版拷贝到 `node_modules` 并重启生效）

### ⚠️ 唯一的坑（必须知道）
DSH profile 的 pnpm 配置是 `nodeLinker: hoisted` —— `file:` 依赖是**拷贝安装**。修改 `D:\dsh-plugins\...` 源码后，**必须重新运行 `deploy.ps1`（或手动 Copy-Item 同步到 `node_modules`）再重启 DSH**，否则改动不生效。`deploy.ps1` 已自动处理这一步。

### 卸载（完全移除）
1. 删掉 `cordis.patch.yml` 里两段 `insert`
2. 删掉 `package.json` 里两行依赖
3. 删掉 `D:\dsh-plugins\tool-analyze-image` 和 `ollama-lifecycle`
4. 重启 DSH

## ⚠️ 兼容性：发送图片时提示"该模型不支持图片，不能发送"

**原因**：这是 DSH 的**发送前能力门控**。DSH 新版（2026-08 之后）已内置 vision-bridge 放行逻辑（文本模型 + 图片会放行，交给 `llm/stream` 转换）；**旧版 DSH 会在发送时直接拒绝**（`Model "..." does not support image input`）。

**解决（三选一）**：
1. **升级 DSH 到最新版**（推荐）—— 新版已放行，配合本插件即可拖图即用
2. **用 `analyze_image` 工具代替拖图**（任何版本都可用）：把图片放到工作区，对 AI 说"分析 xxx.png"—— 不走发送门控
3. 临时切到 `Qwen2.5-VL`（Ollama 视觉模型）直接看图对话，再切回 DeepSeek

> 本插件无法强制旧版 DSH 放行（门控在内核，无插件挂钩）—— 但方案 1/2 都能让你正常用上千问看图。

## 🚨 故障恢复（DSH 启动失败 / 打不开时必读）

DSH 启动时会**严格校验** `cordis.patch.yml`：只要格式/依赖有问题就会**拒绝启动**（不是跳过）。所以"打不开"几乎总是配置被改坏。恢复方法：

**方法 A：用 deploy.ps1 的备份恢复（推荐）**
部署脚本每次运行都会生成带时间戳的备份（如 `cordis.patch.yml.bak-20260815-173000`）。恢复：
```powershell
# 找到最近的备份文件，复制回去覆盖
copy "%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml.bak-*" "%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml"
copy "%USERPROFILE%\.dsh\profiles\web\package.json.bak-*"      "%USERPROFILE%\.dsh\profiles\web\package.json"
# 如果 settings.yaml 也被改过，同样恢复
copy "%USERPROFILE%\.dsh\settings.yaml.bak-*" "%USERPROFILE%\.dsh\settings.yaml"
```

**方法 B：手工还原**
1. 打开 `%USERPROFILE%\.dsh\profiles\web\`
2. 编辑 `cordis.patch.yml`：**删掉**其中 `tool-analyze-image` 和 `ollama-lifecycle` 两段 `insert`（保留原有内容；最坏情况把文件内容清空为只含注释）
3. 编辑 `package.json`：删掉 `"tool-analyze-image"` 和 `"ollama-lifecycle"` 两行依赖
4. 如果动过 `settings.yaml`：还原它（删掉 `ollama` provider 段或恢复备份）
5. 重新启动 DSH → 应恢复原状（回到无视觉插件状态，不影响正常使用）

> 💡 **最小化排障**：恢复后，先只加 `tool-analyze-image`（不带 `ollama-lifecycle`）测试；成功后再加第二个。一次只动一个变量，出问题立刻知道是谁。 

---

## ✅ 验证清单（按顺序）

1. **Ollama 活着**：`Invoke-RestMethod http://127.0.0.1:11434/api/version` 返回版本号
2. **插件加载**：DSH 会话的工具列表里能看到 `analyze_image` 工具（AI 可通过工具列表查询）
3. **bridge 生效（无图路径）**：正常文字对话不受影响
4. **bridge 生效（带图路径）**：拖一张真实图片 + 提问，应看到回复基于千问对**该图片**的分析（而不是报 `The DeepSeek chat-completions adapter does not support image content`）
5. **工具路径**：对 AI 说"分析 xxx.png"，`analyze_image` 返回本地视觉模型描述

---

## 🔧 故障排查表

| 症状 | 根因 | 处理 |
|---|---|---|
| `The DeepSeek ... does not support image content` | bridge 未生效：插件没加载 / node_modules 是旧拷贝 / 监听没 `global: true` | ① 同步源码到 `node_modules\` ② 确认 `lib/index.js` 含 `{ global: true }` ③ 重启 DSH |
| 分析结果张冠李戴（描述的是别的图） | AI 误调 `analyze_image` 分析了错误文件，或工作区有误导性图片 | 删除误导文件；bridge 注入文本已带"直接使用、勿再读文件"指示 |
| 每次拖图都要等 10~30 秒 | Ollama 模型被卸载重载 | 请求带 `keep_alive: -1`（本项目已加）；模型常驻显存后热调用 ~4 秒 |
| 显存不足 | 7B 模型 + 其他占用 | 换 `qwen2.5vl:3b`；关闭其他占显存程序 |
| 改了插件源码不生效 | `nodeLinker: hoisted` 拷贝安装 | `Copy-Item D:\dsh-plugins\tool-analyze-image\* <profile>\node_modules\tool-analyze-image\ -Recurse -Force` 后重启 |
| Ollama 没被拉起 | ollama-lifecycle 未加载 / 路径错 | 检查 `cordis.patch.yml` 的 `ollamaPath`；手动 `D:\Ollama\ollama.exe serve` 测试 |

---

## 🧩 关键实现细节（维护者必读）

### tool-analyze-image / lib/index.js
- **`installVisionBridge(ctx, ...)`**：
  - `ctx.on('llm/stream', (options, next) => {...}, { global: true })` —— 同步函数，返回 async generator
  - `contentHasImage()` 检测图片（递归识别 `image` 块）
  - `ctx.get('llm').resolveModelInfo()` 判断目标模型是否支持图片；任何不确定都**替换而不是放行**（保守原则）
  - 只分析**最新**一条含图消息；历史图片替换为 `[图片内容]` 占位，避免多轮重复调用
  - `attachments.readImage(block.attachment)` 读图（内容寻址，验证哈希）
  - `visionDescribe()` 调 `http://127.0.0.1:11434/v1/chat/completions`，带 `keep_alive: -1`
  - 替换后消息**冻结**（`Object.freeze`），满足 agent-loop invariant 的冻结检查
  - `llm.adapterStream(modifiedOptions)` 直连适配器（绕过 waterfall 的 next 限制）
- **`analyze_image` 工具**：模型可调，`file_path` 支持绝对/相对路径（相对 cwd 和 workspaceRoot），请求也带 `keep_alive: -1`

### ollama-lifecycle / lib/index.js
- apply 时探测 `11434`，未运行则 `spawn('ollama.exe', ['serve'], { windowsHide: true })`，等待就绪（默认 20s）
- `ctx.effect()` 注册清理：DSH 关闭时 `taskkill /IM ollama.exe /F /T`（不杀桌面 UI `ollama app.exe`）
- `killOnExit: false` 可改为"只启动不清理"

---

## 📦 GitHub 发布提示（模型不传！）

- 整个代码包约 **25 KB**，可直接 push 到 GitHub（单文件 <100MB，仓库 <1GB）
- **Ollama 模型（5.6GB）绝不入库**：超 GitHub 单文件 100MB 上限，LFS 免费额度 1GB 也不够。README 已写"使用者自行 `ollama pull qwen2.5vl:7b`"
- `.gitignore` 已排除 `node_modules/`、`ollama/models/`、`sessions/`、`*.log`、`settings.yaml`（含密钥）

## 📄 License

MIT
