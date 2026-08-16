# DSH 壁纸插件 v3（可发给他人）

给 DeepSeek Harness 聊天界面加上「深色壁纸 + 半透明界面 + 自动轮播 + 文件夹扫描」。右下角 🎨 按钮打开设置面板，缩放/位置/亮度/遮罩/透明度全部可调并自动保存。

## 里面有什么
- `firefly-wallpaper.js` —— 核心脚本（v3 单文件，样式/面板/逻辑都在里面）
- `assets/firefly-bg/` —— 示例图片（firefly-1/2/3.png）
- `sync_firefly.ps1` —— 可选：把本地文件夹图片同步成 firefly-bg 清单
- `README.txt` —— 本说明

## 怎么装（给收到的对方）
1. 把 `firefly-wallpaper.js` 放进对方 DSH 前端的 **dist 目录**：
   - 路径形如 `……\node_modules\.pnpm\@deepseek-ai+dsh-web-fronte_XXXX\node_modules\@deepseek-ai\dsh-web-frontend\dist\`
   - 需要壁纸图片的话，也放进该 dist 的 `assets/firefly-bg/` 下
2. 打开该 dist 下的 **`index.html`**，在 **`</body>` 前面**加一行：
   ```html
   <script src="firefly-wallpaper.js"></script>
   ```
3. 保存，强刷页面（Ctrl+F5），右下角出现 🎨 按钮。

> 注意：这是改前端静态文件，改完需要强刷（Ctrl+F5）生效，不用重启 DSH 服务。

## 怎么换图片
- 改 `firefly-wallpaper.js` 顶部【配置区】的 `默认图片` 数组（相对路径或网络 URL 都行）；
- 或点设置面板里的「📁 选择文件夹」直接选本地文件夹（不落盘，仅当前页面生效）；
- 或运行 `sync_firefly.ps1` 生成 `firefly-list.json`，页面加载时自动扫描更新。

## 设置面板里能调
- 上一张 / 下一张、自动轮播间隔（1 / 2 / 5 / 10 分钟）
- 缩放 %、水平位置 %、垂直位置 %
- 壁纸亮度 %、暗色遮罩 %
- 界面透光 %、对话框透明度 %
- 全部自动保存到浏览器 localStorage，面板可按住顶部拖动

## 内置修复
- **设置面板等弹窗背景强制不透明**：即使把界面透光/对话框透明调得很低，DSH 的设置面板等弹窗文字依然清晰。

## 附：一键同步脚本
`sync_firefly.ps1 -FOLDER "C:\你的\图片文件夹"` 会把该文件夹里的图片复制为 `assets/firefly-bg/firefly-N.*` 并生成 `firefly-list.json`（只同步图片，不会覆盖 index.html 里已注入的脚本）。
