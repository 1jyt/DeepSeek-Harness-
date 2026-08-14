# DeepSeek Wallpaper 🎨

给 [DeepSeek Harness](https://github.com/deepseek-ai) 聊天界面铺上你自己的图片壁纸，并让界面半透明、文字依然清晰。

Put your own image wallpaper onto the [DeepSeek Harness](https://github.com/deepseek-ai) chat UI, with a translucent interface so text stays readable.

> 不包含任何图片素材。壁纸图片由使用者自己提供（见下方「配置图片」）。
> No images are bundled. You provide the wallpaper images yourself (see “Picture config” below).

---

## 功能 Features

- 🖼️ 多图自动轮播 + 手动上一张/下一张 — Auto-rotate slideshow + manual prev/next
- 🔄 位置可调：水平 / 垂直百分比滑块 — Position: horizontal / vertical % sliders
- 🔍 缩放 50–250% — Zoom 50–250%
- ☀️ 真实亮度调节（CSS filter，30–150%） — Real brightness (CSS filter)
- 🌑 暗色遮罩、界面透光、**对话框单独透明度** — Mask, UI translucency, **separate bubble transparency**
- ⏱️ 自动切换间隔可调（0=关闭） — Auto-switch interval (0 = off)
- 💾 设置自动保存到本地 — Settings saved to localStorage
- 🌐 双语言界面（中文 / English） — Bilingual panel

---

## 安装 Installation

这个脚本不依赖任何编译好的哈希资源，任何版本的 DeepSeek Harness 都适用。

It has no dependency on any built asset hashes, so it works with any DeepSeek Harness build.

1. 把 `deepseek-wallpaper.js` 放进你 DSH 前端的 `dist` 目录：
   Put `deepseek-wallpaper.js` into your DSH front-end `dist` folder, e.g.:
   ```
   ...\node_modules\.pnpm\@deepseek-ai+dsh-web-fronte_X...\node_modules\@deepseek-ai\dsh-web-frontend\dist\
   ```
   （那串 `X...` 是安装时生成的哈希，每台机器不同；找以 `dsh-web-frontend` 结尾的路径即可。
   The `X...` is a per-install hash; find the path ending in `dsh-web-frontend`.)

2. 打开该 `dist` 下的 `index.html`，在 **`</body>` 前面**加一行：
   Edit `index.html` in that `dist` folder and add this line **right before `</body>`**:
   ```html
   <script src="deepseek-wallpaper.js"></script>
   ```

3. 保存并强刷页面（`Ctrl+F5`），右下角出现 🎨 按钮。
   Save and hard-refresh (`Ctrl+F5`). A 🎨 button appears at bottom-right.

> 修改的是前端静态文件，**刷新即可生效，无需重启 DSH 服务**。
> You only change a static file — refresh is enough, no need to restart DSH.

---

## 配置图片 Picture config

打开 `deepseek-wallpaper.js`，在顶部【配置区】的 `图片列表` 里填写地址（相对路径或 `https://` 都行）：

Edit the `图片列表` (image list) at the top of `deepseek-wallpaper.js`. Relative paths or `https://` URLs both work.

```js
var 图片列表 = [
  'assets/wallpapers/a.jpg',        // 相对路径 relative path
  'https://example.com/b.webp',     // 网络地址 network URL
];
```

- 只填 1 张 = 固定不轮播。 List 1 image = no rotation.
- 留空时显示占位渐变。 Empty = shows a placeholder gradient.

### 默认参数 Defaults
`默认缩放 / 默认水平 / 默认垂直 / 默认亮度 / 默认遮罩 / 默认透光 / 默认对话透明 / 默认切换分钟`
（`zoom / hx / vy / bright / mask / ui / bubble / min`）

---

## 设置面板解释 Panel

| 控件 Control | 说明 Description |
|---|---|
| Zoom 缩放 | 50–250% |
| Horizontal 水平位置 | 0 左 → 100 右 |
| Vertical 垂直位置 | 0 上 → 100 下 |
| Brightness 壁纸亮度 | 30–150%（真实调亮/调暗） |
| Mask 暗色遮罩 | 0–100%（越大越暗、文字越清晰） |
| UI 界面透光 | 0–100%（越大界面越不透明） |
| Bubble 对话框透明 | 30–100%（对话气泡/输入框单独透明度） |
| Auto 自动切换 | 分钟；0=关闭 |

---

## 目录结构 Structure

```
deepseek-wallpaper/
├── deepseek-wallpaper.js   # 核心脚本 main script
├── README.md
└── assets/                 # 可选：放你自己的图 / put your images here
```

---

## License

MIT
