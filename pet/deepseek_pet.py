#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
DeepSeek 桌宠 DeepSeekPet
------------------------------------------------
一个简约的 Windows 桌面悬浮宠物（tkinter 实现，免安装 Electron/npm）。

功能：
  * 常驻桌面、置顶、无边框、透明背景
  * 鼠标拖拽移动
  * 单击 -> 说话气泡（随机台词）
  * 双击 -> 用浏览器打开 DeepSeek Web 界面 (DSH_WEB_URL)
  * 右键 -> 菜单（打开界面 / 更换形象 / 隐藏气泡台词 / 退出）
  * 悬浮浮动动画（缓慢上下浮动）
  * 更换形象：右上角 (q2, 默认) <-> 左下角 (q3)

用法：
  python deepseek_pet.py
"""
import os
import sys
import json
import random
import subprocess
import threading
import webbrowser
import tkinter as tk
from PIL import Image, ImageTk

# ---------------------------------------------------------------- config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSET_DIR = os.path.join(BASE_DIR, "..", "assets", "chars")
DSH_URL = os.environ.get("DSH_WEB_URL", "http://127.0.0.1:3080")
# 本地呼叫信号文件：外部（如 DeepSeek 会话 agent / 任何程序）往里面写入
# "CALL|要她说的话"，桌宠轮询到新内容 => 唤醒并说话回应。
CALL_FILE = os.path.join(BASE_DIR, "call_signal.txt")
# 设置持久化：记录上次的位置/缩放/形象，下次启动自动恢复
SETTINGS_FILE = os.path.join(BASE_DIR, "pet_settings.json")
# DSH 启动脚本（与桌面上 "DeepSeek Harness.lnk" 相同）；
# 存在则“打开界面”时优先用它启动后端并打开浏览器。
LAUNCH_SCRIPT = (r"C:\Users\Lenovo\Documents\Codex\2026-08-13\new-chat\work"
                 r"\dsh-app\launch_dsh.ps1")

# 使用哪个形象（当前只保留 ds娘 这一个）
CHARS = {
    "dsniang": "ds娘",
}
DEFAULT_CHAR = "dsniang"

# 缩放比例（1.0 = 原始大小，0.6 = 缩到 60%，用来让形象小巧一点）
SCALE = 0.6
SCALE_MIN, SCALE_MAX, SCALE_STEP = 0.25, 1.5, 0.05

# 透明键色：窗口与图片中对应的颜色会被操作系统变成完全透明
KEY_COLOR = "#020304"

LINES = [
    "Hi~ 我是 DeepSeek 👋",
    "双击我就能打开我的界面哦",
    "右键看看有什么好玩的功能~",
    "拖着我玩一下呗 🎈",
    "今天也要加油鸭！",
    "需要帮忙随时喊我",
    "我是你的桌面小助手呀",
    "(•̀ᴗ•́)و 一起进步吧",
    "我在 127.0.0.1:3080 等你",
    "右键可以更换我的形象哦",
]


# ---------------------------------------------------------------- preprocessing
def flatten_for_key(filename, key_rgb):
    """把透明 PNG 转成“无黑边硬边”RGB，供透明键色窗口显示。

    传统做法(alpha_composite到键色)会让半透明边缘叠加键色、
    在近黑键色上形成一圈暗色光环。这里改为：非透明像素直接原色上屏，
    只有完全透明(alpha=0)的像素填键色 -> 由系统转透明。
    配合启动时的轻微 alpha 收缩，可在透明背景上得到干净不泛黑的轮廓。
    """
    path = os.path.join(ASSET_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"找不到形象文件: {path}")
    img = Image.open(path).convert("RGBA")
    rgba = img.copy()
    px = rgba.load()
    W, H = rgba.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0:
                px[x, y] = (key_rgb[0], key_rgb[1], key_rgb[2], 255)
            # a>0: 保持原色（不叠加键色），以消除黑边
    return rgba.convert("RGB")


# ---------------------------------------------------------------- speech bubble
class SpeechBubble(tk.Toplevel):
    """一个置顶的迷你气泡，显示一句台词后自动消失。

    同一时刻只保留一条：新气泡创建时旧气泡会被上层销毁。
    带 on_close 回调，用于上层清理引用；并做健壮销毁，杜绝残留白框。
    """
    _BUBBLE_SEQ = 0

    def __init__(self, master, text, anchor_point,
                 lifetime_ms=3500, on_close=None):
        super().__init__(master)
        SpeechBubble._BUBBLE_SEQ += 1
        self._bubble_id = SpeechBubble._BUBBLE_SEQ
        self._on_close = on_close

        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)
        self.config(bg=KEY_COLOR)
        self.wm_attributes("-transparentcolor", KEY_COLOR)
        # 追踪到全局集合，便于清理
        if hasattr(master, "_all_bubbles"):
            master._all_bubbles.add(self)

        bubble_bg = "#1f2430"
        text_fg = "#f5f6fa"
        padx, pady = 14, 10

        lbl = tk.Label(
            master=self, text=text, bg=bubble_bg, fg=text_fg,
            font=("Microsoft YaHei UI", 11),
            padx=padx, pady=pady, wraplength=230, justify="left",
            highlightthickness=1, highlightbackground="#3a4256",
        )
        lbl.pack()
        self.update_idletasks()
        w = lbl.winfo_reqwidth()
        h = lbl.winfo_reqheight()
        if w < 10 or h < 10:            # 兜底，避免默认 200x200 白框
            w, h = 140, 40
        ax, ay = anchor_point
        # 气泡放在角色上方，稍微靠右
        x = ax - w // 2 + 40
        y = ay - h - 18
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        x = max(4, min(x, sw - w + 4))
        y = max(4, y if y > 4 else 4)
        # 显式给定尺寸，杜绝默认 200x200 白框
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.after(lifetime_ms, self._safe_destroy)
        # 若 2 秒后仍是默认 200x200 未map的异常窗口，强制销毁防白框
        self._failsafe_timer = self.after(2000, self._failsafe_destroy)

    def _failsafe_destroy(self):
        """极端兜底：如果这个气泡没被正常关闭且仍是默认尺寸，清理掉。"""
        try:
            if self.winfo_exists():
                self.destroy()
        except Exception:
            pass

    def _safe_destroy(self):
        try:
            if not self.winfo_exists():
                return
            self.destroy()
        except Exception:
            pass

    def destroy(self):
        # 保证 on_close 只回调一次，并取消兜底定时器
        try:
            if hasattr(self, "_on_close") and self._on_close:
                cb, self._on_close = self._on_close, None
                try:
                    cb(self._bubble_id)
                except Exception:
                    pass
        except Exception:
            pass
        try:
            if getattr(self, "_failsafe_timer", None):
                self.after_cancel(self._failsafe_timer)
        except Exception:
            pass
        try:
            super().destroy()
        except Exception:
            pass


# ---------------------------------------------------------------- pet app
class DeepSeekPet:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("DeepSeek Pet")
        self.root.overrideredirect(True)
        self.root.wm_attributes("-topmost", True)
        self.root.config(bg=KEY_COLOR)
        self.root.wm_attributes("-transparentcolor", KEY_COLOR)

        self.current_char = DEFAULT_CHAR
        self._scale = SCALE
        self._load_image()

        # 画布：角色画进 Canvas，悬浮通过移动 canvas item 实现（轻量、顺滑），
        # 而不是每帧移动整个 OS 窗口（那会很卡）。
        self.canvas = tk.Canvas(
            self.root, width=self._img_w, height=self._img_h + 8,
            bg=KEY_COLOR, bd=0, highlightthickness=0)
        self.canvas.pack()
        self._item = self.canvas.create_image(
            0, 8, image=self.photo, anchor="nw")

        # 让窗口贴合图片大小
        self.root.update_idletasks()
        self.root.geometry(f"{self._img_w}x{self._img_h + 8}")

        # --- 交互状态
        self._drag_start = None
        self._win_start = None
        self._anim_counter = 0
        self._click_pending = False
        self._click_job = None
        # 气泡管理（同一时刻一条 + 防残留）
        self._active_bubble = None
        self._all_bubbles = set()

        # --- 读取上次设置（位置/缩放/形象），校验后应用
        saved = self._load_settings()
        self._home_x = None
        self._home_y = None
        sx = sy = None
        if saved:
            if saved.get("char") in CHARS:
                self.current_char = saved["char"]
            scl = saved.get("scale")
            if isinstance(scl, (int, float)) and SCALE_MIN <= scl <= SCALE_MAX:
                self._scale = scl
            self._reload_display()   # 按新 char/scale 重新生成 photo
            sx = saved.get("x") if isinstance(saved.get("x"), int) else None
            sy = saved.get("y") if isinstance(saved.get("y"), int) else None

        if sx is not None and sy is not None:
            # 校验位置在屏幕内
            sw = self.root.winfo_screenwidth()
            sh = self.root.winfo_screenheight()
            if 0 <= sx < sw - 10 and 0 <= sy < sh - 10:
                self._home_x, self._home_y = sx, sy
                self.root.geometry(f"+{sx}+{sy}")
            else:
                self._place_bottom_right()
        else:
            # 无存档 -> 右下角
            self._place_bottom_right()

        if self._home_x is None or self._home_y is None:
            self._home_x = self._home_x if self._home_x is not None else self.root.winfo_x()
            self._home_y = self._home_y if self._home_y is not None else self.root.winfo_y()

        # 呼叫信号监听（mainloop 每 250ms 轮询一次本地文件）
        self._last_call = None
        self._clear_call_file()
        self._poll_call()

        # --- 事件绑定
        self.canvas.bind("<Button-1>", self._on_click_down)
        self.canvas.bind("<B1-Motion>", self._on_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_click_up)
        self.canvas.bind("<Double-Button-1>", self._on_double_click)
        self.canvas.bind("<Button-3>", self._on_right_click)
        self.root.bind("<Button-3>", self._on_right_click)

        # --- 动画
        self._animate()
        self._sweep_stray_bubbles()  # 定时清理可能残留的气泡窗口

        # --- 开场白
        self._speak(random.choice(LINES), delay=700)

    # ---------------------------------------------------------- image
    def _load_image(self):
        key_rgb = tuple(int(KEY_COLOR[i:i + 2], 16) for i in (1, 3, 5))
        flat = flatten_for_key(self.current_char + ".png", key_rgb)
        # 按缩放比例缩小
        nw = max(1, round(flat.width * self._scale))
        nh = max(1, round(flat.height * self._scale))
        if (nw, nh) != flat.size:
            flat = flat.resize((nw, nh), Image.LANCZOS)
        # 绘制一个合适的显示尺寸
        self.photo = ImageTk.PhotoImage(flat)
        self._img_w, self._img_h = flat.size

    def _reload_display(self):
        """按当前 char/scale 重新载入并应用显示（保持当前位置）。"""
        cur_x = self.root.winfo_x()
        cur_y = self.root.winfo_y()
        have_pos = cur_x > -32000 and cur_y > -32000  # 有效窗口位置
        self._load_image()
        if hasattr(self, "canvas"):
            self.canvas.config(width=self._img_w, height=self._img_h + 8)
            self.canvas.itemconfig(self._item, image=self.photo)
            self.canvas.coords(self._item, 0, 8)
            # 重排窗口大小
            geo_w = self._img_w
            geo_h = self._img_h + 8
            if have_pos:
                self.root.geometry(f"{geo_w}x{geo_h}+{cur_x}+{cur_y}")
            else:
                self.root.geometry(f"{geo_w}x{geo_h}")
        elif hasattr(self, "label"):
            self.label.config(image=self.photo)
            if have_pos:
                self.root.geometry(
                    f"{self.photo.width()}x{self.photo.height()}+{cur_x}+{cur_y}")
            else:
                self.root.geometry(f"{self.photo.width()}x{self.photo.height()}")

    # ---------------------------------------------------------- settings
    def _load_settings(self):
        try:
            if os.path.exists(SETTINGS_FILE):
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return {}

    def _save_settings(self):
        """把当前 位置/缩放/形象 写入配置，供下次启动恢复。"""
        try:
            wx = self.root.winfo_x()
            x = self._home_x if self._home_x is not None and wx > -32000 else wx if wx > -32000 else 0
            y = self._home_y if self._home_y is not None else 0
            data = {
                "x": int(x),
                "y": int(y),
                "scale": round(self._scale, 3),
                "char": self.current_char,
            }
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
        except Exception:
            pass

    # ---------------------------------------------------------- placement
    def _place_bottom_right(self):
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        w = self.photo.width()
        h = self.photo.height()
        x = sw - w - 90
        y = sh - h - 80
        self._home_x, self._home_y = x, y
        self.root.geometry(f"+{x}+{y}")

    # ---------------------------------------------------------- interact
    def _on_click_down(self, event):
        # 右击不触发拖拽逻辑
        self._drag_start = (event.x_root, event.y_root)
        self._win_start = (self.root.winfo_x(), self.root.winfo_y())
        # 双击判定：记录一次单击候选
        self._click_pending = True
        if self._click_job:
            self.root.after_cancel(self._click_job)
        self._click_job = self.root.after(240, self._resolve_single_click)

    def _on_drag(self, event):
        if self._drag_start is None:
            return
        dx = event.x_root - self._drag_start[0]
        dy = event.y_root - self._drag_start[1]
        nx = self._win_start[0] + dx
        ny = self._win_start[1] + dy
        self._home_x, self._home_y = nx, ny
        self.root.geometry(f"+{nx}+{ny}")

    def _on_click_up(self, event):
        # 拖拽结束后，把当前位置视为新的“家”，便于浮动动画围绕它进行
        if self._drag_start is not None:
            self._home_x = self.root.winfo_x()
            self._home_y = self.root.winfo_y()
        self._drag_start = None
        self._save_settings()

    def _resolve_single_click(self):
        """如果在 240ms 内没有发生第二次点击，视为单击 -> 说话。"""
        if self._click_pending:
            self._click_pending = False
            self._speak(random.choice(LINES))

    def _on_double_click(self, event):
        self._click_pending = False
        if self._click_job:
            self.root.after_cancel(self._click_job)
            self._click_job = None
        self._open_web()

    def _open_web(self):
        """打开 DeepSeek 界面：优先走你的 DSH 启动脚本（同桌面 lnk），后台执行不卡桌宠。"""
        url = DSH_URL

        def _do_open():
            if LAUNCH_SCRIPT and os.path.exists(LAUNCH_SCRIPT):
                # 与“DeepSeek Harness.lnk”一致：powershell 跑 launch_dsh.ps1
                # 会先确保后端在跑，再打开默认浏览器到界面。
                ok = self._run_launch_script()
                if ok:
                    return
            if self._open_with_edge(url):
                return
            if self._open_with_shell(url):
                return
            try:
                webbrowser.open(url, new=2)
            except Exception:
                self._speak("无法打开浏览器，请手动访问 " + url)

        threading.Thread(target=_do_open, daemon=True).start()
        self.root.after(10, lambda: self._speak("正在打开我的界面…"))

    def _run_launch_script(self):
        """后台启动 DSH 启动脚本（非阻塞）。"""
        try:
            subprocess.Popen(
                ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
                 "-File", LAUNCH_SCRIPT],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                close_fds=True,
            )
            return True
        except Exception:
            return False

    def _open_with_edge(self, url):
        """直接用 Edge 打开（已知用户默认是 Edge，最稳、不阻塞）。"""
        candidates = [
            os.environ.get("ProgramFiles") and os.path.join(
                os.environ["ProgramFiles"], "Microsoft", "Edge",
                "Application", "msedge.exe"),
            os.environ.get("ProgramFiles(x86)") and os.path.join(
                os.environ["ProgramFiles(x86)"], "Microsoft", "Edge",
                "Application", "msedge.exe"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""),
                         "Microsoft", "Edge", "Application", "msedge.exe"),
        ]
        for path in candidates:
            if path and os.path.exists(path):
                try:
                    subprocess.Popen([path, url],
                                     stdout=subprocess.DEVNULL,
                                     stderr=subprocess.DEVNULL)
                    return True
                except Exception:
                    pass
        return False

    def _open_with_shell(self, url):
        """用 os.startfile 打开 URL（Windows 系统默认浏览器，不阻塞）。"""
        try:
            os.startfile(url)
            return True
        except Exception:
            pass
        try:
            subprocess.Popen(["cmd", "/c", "start", "", url],
                             shell=False,
                             stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL)
            return True
        except Exception:
            return False

    def _speak(self, text, delay=0):
        if delay:
            self.root.after(delay, lambda: self._spawn_bubble(text))
        else:
            self._spawn_bubble(text)

    def _spawn_bubble(self, text):
        try:
            # 同一时刻只保留一条气泡：新的出来前，先关掉旧的
            self._close_active_bubble()
            x = self.root.winfo_x() + self.photo.width() // 2
            y = self.root.winfo_y()
            bub = SpeechBubble(self.root, text, (x, y),
                               on_close=self._clear_active_bubble)
            self._active_bubble = {"win": bub, "id": bub._bubble_id}
        except Exception:
            pass

    def _close_active_bubble(self):
        try:
            if self._active_bubble:
                try:
                    self._active_bubble["win"].destroy()
                except Exception:
                    pass
                self._active_bubble = None
        except Exception:
            pass

    def _clear_active_bubble(self, bubble_id):
        try:
            if self._active_bubble and self._active_bubble.get("id") == bubble_id:
                self._active_bubble = None
        except Exception:
            pass

    def _sweep_stray_bubbles(self):
        """定时清理可能残留的气泡窗口，防止左上角出现白色框。"""
        try:
            active = self._active_bubble["win"] if self._active_bubble else None
            maybe_stray = list(getattr(self, "_all_bubbles", set()))
            for b in maybe_stray:
                if b is active:
                    continue
                try:
                    if b.winfo_exists():
                        b.destroy()
                except Exception:
                    pass
                try:
                    self._all_bubbles.discard(b)
                except Exception:
                    pass
        except Exception:
            pass
        self.root.after(1500, self._sweep_stray_bubbles)

    # ---------------------------------------------------------- 呼叫（从对话页喊 ds娘）
    def _clear_call_file(self):
        """启动时清空信号文件，避免旧指令残留。"""
        try:
            with open(CALL_FILE, "w", encoding="utf-8") as f:
                f.write("")
        except Exception:
            pass

    def _poll_call(self):
        """轮询 CALL_FILE：外部写入 "CALL|要她说的内容" => 唤醒并说话。"""
        try:
            if os.path.exists(CALL_FILE):
                with open(CALL_FILE, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                if content and content != self._last_call:
                    self._last_call = content
                    text = content
                    if content.startswith("CALL|"):
                        text = content[len("CALL|"):]
                    self._wake(text)
        except Exception:
            pass
        self.root.after(250, self._poll_call)

    def _wake(self, text):
        """唤醒：把角色移到屏幕中上部醒目位置，并说话回应。"""
        try:
            sw = self.root.winfo_screenwidth()
            sh = self.root.winfo_screenheight()
            x = sw // 2 - self._img_w // 2
            y = int(sh * 0.42)
            self._home_x, self._home_y = x, y
            self.root.geometry(f"+{x}+{y}")
            self.root.attributes("-topmost", True)
        except Exception:
            pass
        self._speak(text if text else "ds娘在这里哦~")
        # 说两遍的分隔：清空文件，允许下一次再触发
        def _reset():
            self._clear_call_file()
            self._last_call = None
        self.root.after(600, _reset)

    # ---------------------------------------------------------- resize
    def _resize(self, delta):
        """以当前中心为锚点，整体放大/缩小形象。"""
        new_scale = self._scale + delta
        new_scale = max(SCALE_MIN, min(SCALE_MAX, new_scale))
        if new_scale == self._scale:
            self._speak("已经到极限啦~")
            return
        # 保持窗口中心不动
        cx = self.root.winfo_x() + self._img_w // 2
        cy = self.root.winfo_y() + (self._img_h + 8) // 2
        self._scale = new_scale
        self._load_image()
        self.canvas.config(width=self._img_w, height=self._img_h + 8)
        self.canvas.itemconfig(self._item, image=self.photo)
        self.canvas.coords(self._item, 0, 8)
        nx = cx - self._img_w // 2
        ny = cy - (self._img_h + 8) // 2
        self._home_x, self._home_y = nx, ny
        self.root.geometry(f"{self._img_w}x{self._img_h + 8}+{nx}+{ny}")
        self._save_settings()
        self._speak(f"尺寸调到 {self._scale:.0%} 啦")

    # ---------------------------------------------------------- right-click menu
    def _on_right_click(self, event):
        menu = tk.Menu(self.root, tearoff=0, bg="#1f2430", fg="#f5f6fa",
                       activebackground="#3a4256", activeforeground="#ffffff",
                       font=("Microsoft YaHei UI", 10))
        menu.add_command(label="打开 DeepSeek 界面", command=self._open_web)
        menu.add_command(label="说句话", command=lambda: self._speak(random.choice(LINES)))

        sub = tk.Menu(menu, tearoff=0, bg="#1f2430", fg="#f5f6fa",
                      activebackground="#3a4256", activeforeground="#ffffff",
                      font=("Microsoft YaHei UI", 10))
        for key, label_text in CHARS.items():
            sub.add_command(
                label=("✓ " if key == self.current_char else "  ") + label_text,
                command=lambda k=key: self._switch_char(k),
            )
        menu.add_cascade(label="更换形象", menu=sub)

        size_sub = tk.Menu(menu, tearoff=0, bg="#1f2430", fg="#f5f6fa",
                           activebackground="#3a4256", activeforeground="#ffffff",
                           font=("Microsoft YaHei UI", 10))
        size_sub.add_command(label=f"放大（当前 {SCALE:.0%}）",
                             command=lambda: self._resize(SCALE_STEP))
        size_sub.add_command(label="缩小",
                             command=lambda: self._resize(-SCALE_STEP))
        menu.add_cascade(label="调整大小", menu=size_sub)

        menu.add_separator()
        menu.add_command(label="退出", command=self._quit)
        try:
            menu.tk_popup(event.x_root, event.y_root)
        finally:
            menu.grab_release()

    def _quit(self):
        self._save_settings()
        try:
            self.root.destroy()
        except Exception:
            pass

    def _switch_char(self, key):
        if key == self.current_char:
            return
        self.current_char = key
        self._load_image()
        self.canvas.config(width=self._img_w, height=self._img_h + 8)
        self.canvas.itemconfig(self._item, image=self.photo)
        self.canvas.coords(self._item, 0, 8)
        # 保持当前位置（粗略）
        cx = self.root.winfo_x() if self.root.winfo_x() > -32000 else self._home_x
        self._home_x = cx
        self._home_y = self.root.winfo_y()
        self.root.geometry(f"{self._img_w}x{self._img_h + 8}+{cx}+{self._home_y}")
        self._save_settings()
        self._speak("换好啦，这个形象喜欢吗？")

    # ---------------------------------------------------------- animation
    def _animate(self):
        """平滑悬浮：只移动 Canvas 内的图像(轻量)，不移动 OS 窗口(贵)，故更顺。"""
        import math
        self._anim_counter += 1
        # 周期性自动说话 + 顺带持久化（约每 40s 一次）
        if self._anim_counter % 2400 == 0:  # 2400 * 16.7ms ≈ 40s
            self._speak(random.choice(LINES), delay=0)
            self._save_settings()

        if self._drag_start is None:
            # 平滑正弦上下（0..7px），全部在 canvas 内完成，窗口静止
            phase = (self._anim_counter % 300) / 300.0
            offset = int(round(3.5 * (1 - math.cos(2 * math.pi * phase))))
            top = 1 + offset          # 1..8，在预留的高度内浮动
            try:
                self.canvas.coords(self._item, 0, top)
            except Exception:
                pass

        # 报告真实帧间隔（仅供参考）
        self.root.after(16, self._animate)  # ~60FPS 调度

    # ---------------------------------------------------------- run
    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    pet = DeepSeekPet()
    pet.run()
