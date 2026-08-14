# DeepSeek 桌宠

一个基于 Windows 桌面悬浮窗的小宠物形象（tkinter 实现，**无需安装 npm/Electron**，系统自带 Python 即可）。

## 启动方式
- 双击桌面的 **`DeepSeek桌宠`** 快捷方式，或
- 双击本目录下的 **`启动桌宠.bat`**，或
- 命令行运行：`pythonw C:\...\pet\deepseek_pet.py`

> 后端 **DeepSeek / DSH Web 界面** 地址：`http://127.0.0.1:3080`（桌宠双击即可在浏览器打开它）。

## 互动方式
| 操作 | 效果 |
|------|------|
| **拖拽** | 移动角色（松手后它会围绕当前位置呼吸式浮动） |
| **单击** | 说话气泡（随机台词） |
| **双击 / 右键“打开 DeepSeek 界面”** | 执行 DSH 启动脚本 `launch_dsh.ps1`（同桌面 `DeepSeek Harness.lnk`），确保后端在跑并打开浏览器到界面（后台线程执行，不卡桌宠） |
| **右键** | 菜单：打开界面 / 说句话 / **调整大小** / 退出 |

## 从对话页呼叫她（「喊 ds娘」）
桌宠会轮询本地指令文件 **`call_signal.txt`**（本目录下）。
只要把这个文件写入一行 `CALL|要她说的话`，她**就会被唤醒**（移到屏幕中上部醒目位置）并**弹出那句话回应**。

- 你在 DeepSeek 对话里喊 **“ds娘”**，会话侧（我）检测到后会自动写这个文件 → 她在桌面唤醒并说话。
- 你也可以自己用记事本/脚本往该文件写 `CALL|xxx` 来唤起她。
- 桌宠启动时会自动清空该文件，每条指令消费后也会重置，以便下次再触发。

## 开机自启动（注册表）
已用注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 开启开机自启：
每次登录 Windows 时自动启动桌宠（用 `pythonw`，无黑窗）。

管理命令（在 `D:\111\ds\pet` 目录执行）：
- `python setup_autostart.py on`     ← 开启开机自启
- `python setup_autostart.py off`    ← 取消
- `python setup_autostart.py status` ← 查看状态

> 想直接改也可以用 `win+R` 输入 `regedit`，到
> `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
> 编辑/删除名为 `DeepSeekPet` 的项。

## 保存上次设置
桌宠会把 **位置 + 大小(缩放比例) + 当前形象** 写到 `pet_settings.json`（本目录）。
下次启动自动恢复：
- 拖拽移动 / 调整大小 / 切换形象 / 退出 时都会保存；
- 运行中也周期备份，防止异常退出丢设置。

## 更换形象 / 调整大小
- 桌宠目前只保留并默认使用形象 **`dsniang`（ds娘）**，取自
  `C:\Users\Lenovo\Desktop\ai\新建文件夹 (2)\1786637837593_.png`（透明 PNG，已缩放到基准高 420px）。
- 右键 → **调整大小**：放大 / 缩小，形象按当前中心缩放，随时微调（默认 60%）。

## 素材说明
`assets/chars/` 只保留一个形象文件：`dsniang.png`。
该图自身为透明 PNG、边缘干净（无黑边），无需去底处理。

## 配置
- 编译 `deepseek_pet.py` 顶部的 `CHARS` / `DEFAULT_CHAR` 可调整形象。
- `SCALE` 为默认缩放比例，`SCALE_STEP` 为每次放大/缩小的步长。
- 编辑 `DSH_URL` 可修改双击打开的地址。
