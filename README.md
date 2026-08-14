# DeepSeek Harness 工具集

一批围绕 [DeepSeek Harness](https://github.com/deepseek-ai) 的小工具：给聊天界面加壁纸、Windows 桌面启动器、以及一个桌面小宠物。

> 本仓库是一组独立小工具的合集，每个子目录都有各自的说明。

---

## 目录 Contents

| 目录 | 作用 | 说明文档 |
|---|---|---|
| [`deepseek-wallpaper/`](deepseek-wallpaper/) | 给 DSH 聊天界面铺自定义壁纸 + 半透明界面（多图轮播、位置/缩放/亮度可调） | [`deepseek-wallpaper/README.md`](deepseek-wallpaper/README.md) |
| [`firefly-dsh-wallpaper/`](firefly-dsh-wallpaper/) | 深色壁纸 + 半透明界面 + 自动轮播的独立小插件（含示例图片，可打包发给他人） | [`firefly-dsh-wallpaper/README.txt`](firefly-dsh-wallpaper/README.txt) |
| [`launcher/`](launcher/) | Windows 启动器（PyInstaller 打包成 exe），用于拉起/定位 DSH 并打开界面 | `launcher/launcher.py` |
| [`pet/`](pet/) | Windows 桌面悬浮桌宠（tkinter，无需 npm/Electron），可互动、可从对话页"喊 ds娘"唤醒 | [`pet/README.md`](pet/README.md) |

---

## 快速概览

- **壁纸**：把 `*.js` 放进 DSH 前端 `dist` 目录，并在 `index.html` 的 `</body>` 前加一行 `<script src="..."></script>`，再强刷页面对应即可。详见各子目录 README。
- **启动器**：`launcher/build_exe.ps1` 会用 PyInstaller 把 `launcher.py` 打包成单文件 exe（编译产物在 `launcher/dist/`，已写入 `.gitignore`）。配置在 `launcher/launcher_config.json`。
- **桌宠**：`pet/deepseek_pet.py` 为桌宠主体，双击 `pet/启动桌宠.bat` 或 `pythonw pet\deepseek_pet.py` 启动，详见 `pet/README.md`。

> ⚠️ `launcher/launcher_config.json` 里可能带有本机绝对路径，上传前注意是否需要自行替换或隐藏。

---

## License

[MIT](LICENSE)
