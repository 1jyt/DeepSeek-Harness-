# DSH 壁纸插件（可发给他人）

给 DeepSeek Harness 聊天界面加上「深色壁纸 + 半透明界面 + 自动轮播」，并且可以自己填图片地址、位置、缩放等参数。

## 里面有什么
- `firefly-wallpaper.js` —— 核心脚本，壁纸/轮播/设置面板都在这里面
- `assets/firefly-bg/` —— 示例图片（firefly-1/2/3.png）
- `README.txt` —— 本说明

## 怎么装（给收到的对方）
1. 把 `firefly-wallpaper.js` 文件和你需要的图片，一起放进对方 DSH 前端的 **dist 目录**：
   - 对方机器上的路径形如：
     `……\node_modules\.pnpm\@deepseek-ai+dsh-web-fronte_XXXXXXXXXXXXXXXX\node_modules\@deepseek-ai\dsh-web-frontend\dist\`
     （那个 `XXXXXXXX` 是安装时生成的哈希，每台机器不同，找 `dsh-web-frontend` 结尾那个就行）
   - 可以把图片放到该 dist 下的 `assets/firefly-bg/` 里。
2. 打开该 dist 下的 **`index.html`**，在 **`</body>` 前面**加一行：
   ```html
   <script src="firefly-wallpaper.js"></script>
   ```
3. 保存，刷新 DSH 网页（建议 Ctrl+F5），右下角会出现 🎨 按钮，点开可调设置。

> 注意：这是改前端静态文件，改完需要 **刷新（强刷 Ctrl+F5）** 生效，不用重启 DSH 服务（除非对方前端是打包缓存）。

## 怎么换图片
打开 `firefly-wallpaper.js`，顶部【配置区】的 `图片列表` 里自己填地址：
```js
var 图片列表 = [
  'assets/firefly-bg/我的图1.png',   // 相对路径（相对 dist 目录）
  'assets/firefly-bg/我的图2.png',
  // 'https://example.com/图.jpg',   // 网络 URL 也可
];
```
- 想用更多就多写几行（逗号分隔）。
- 只用 1 张就固定不轮播。

## 设置面板里能调
- 缩放 % (50~250)
- 水平位置 % (0~100)
- 垂直位置 % (0~100)
- 遮罩强度 %（越大壁纸越暗、文字越清晰）
- 界面透光 %（越大越不透明）
- 自动切换间隔（分钟，0=关）
- 设置会保存在本机浏览器里。

## 只想要图片地址就用这里
位置/缩放等其实都可以直接改 `firefly-wallpaper.js` 顶部的 `默认水平`/`默认垂直`/`默认缩放`/`默认遮罩`/`默认透光`/`默认切换分钟` 这几个变量，保存后再装给任何人即可。

## 附：一键同步脚本
`sync_firefly.ps1` 用于把你桌面某个文件夹里的图片同步成 `assets/firefly-bg/firefly-N.*`（可选，不需要同步也能手动放图）。
