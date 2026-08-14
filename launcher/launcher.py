#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
DeepSeek Harness 启动器（封装为一个独立的 .exe 程序）

双击本程序即可：
  1. 确保 DeepSeek (DSH) 后端在 http://127.0.0.1:3080 运行；
  2. 打开默认浏览器到该界面。

行为与原来的 powershell 版 `launch_dsh.ps1` / 桌面 `DeepSeek Harness.lnk`
一致，但被封装成单一可执行文件，用户双击无黑窗、无脚本可见。

路径定位：优先读取本 exe 同目录下的 launcher_config.json；
若不存/为空则回退到代码内默认路径（编译进 exe 的默认值）。
"""
import json
import os
import socket
import subprocess
import sys
import time

__version__ = "1.0.0"

# ---------------------------------------------------------------- 默认配置
# 打包时把实际路径写进 _default_config；运行时被同目录 launcher_config.json 覆盖。
_default_config = {
    "dsh_app": r"C:\Users\Lenovo\Documents\Codex\2026-08-13\new-chat\work\dsh-app",
    "node_exe": r"C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime"
                r"\dependencies\node\bin\node.exe",
    "host": "127.0.0.1",
    "port": 3080,
    "url": "http://127.0.0.1:3080",
    # 当 node 不存在时，尝试用系统 PATH 里的 node（可为空串以禁用）
    "fallback_system_node": True,
}


def _exe_dir():
    """exe / 脚本所在目录（打包后为 exe 所在目录）。"""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def load_config():
    cfg = dict(_default_config)
    p = os.path.join(_exe_dir(), "launcher_config.json")
    try:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                cfg.update({k: v for k, v in data.items() if v is not None})
    except Exception:
        pass
    return cfg


# ---------------------------------------------------------------- 网络工具
def port_open(host, port, timeout=0.5):
    try:
        with socket.create_connection((host, port), timeout=timeout) as s:
            return True
    except Exception:
        return False


def pick_node(cfg):
    node = cfg.get("node_exe")
    if node and os.path.isfile(node):
        return node
    if cfg.get("fallback_system_node"):
        import shutil
        n = shutil.which("node")
        if n:
            return n
    return None


# ---------------------------------------------------------------- 后端启动
def ensure_backend(cfg):
    """确保后端在跑；若没跑则由 node 启动（隐藏窗口、日志重定向）。"""
    host, port = cfg["host"], cfg["port"]
    app = cfg.get("dsh_app")
    if port_open(host, port):
        return True, "已运行"

    node = pick_node(cfg)
    if not node:
        return False, "未找到 node 运行时"
    if not app or not os.path.isdir(app):
        return False, "未找到 dsh-app 目录"

    bin_path = os.path.join(app, "node_modules", "@deepseek-ai", "dsh",
                            "lib", "bin.js")
    if not os.path.isfile(bin_path):
        return False, f"未找到启动脚本: {bin_path}"

    out = os.path.join(app, "dsh.out.log")
    err = os.path.join(app, "dsh.err.log")

    flags = 0
    if os.name == "nt":
        # CREATE_NO_WINDOW：后端不弹黑窗
        flags = subprocess.CREATE_NO_WINDOW

    try:
        with open(out, "ab") as fo, open(err, "ab") as fe:
            subprocess.Popen(
                [node, bin_path, "web", "--host", host, "--port", str(port)],
                cwd=app,
                stdout=fo, stderr=fe,
                creationflags=flags,
            )
    except Exception as exc:
        return False, f"启动后端失败: {exc}"

    # 等待后端就绪（最多 ~30s）
    deadline = time.time() + 30
    while time.time() < deadline:
        if port_open(host, port, timeout=0.5):
            return True, "已启动"
        time.sleep(0.4)
    return False, "后端启动超时"


def open_browser(cfg):
    url = cfg.get("url") or f"http://{cfg['host']}:{cfg['port']}"
    try:
        os.startfile(url)          # Windows 默认浏览器，不阻塞
        return True
    except Exception:
        pass
    try:
        import webbrowser
        webbrowser.open(url, new=2)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------- 主流程
def main():
    cfg = load_config()
    ok, note = ensure_backend(cfg)
    if not ok:
        # 弹出提示（GUI 版本由调用方处理；这里用 windows 消息框）
        _msgbox("DeepSeek Harness 启动失败", note + "\n" + str(cfg).replace(",", ",\n"))
        return 1
    open_browser(cfg)
    return 0


def _msgbox(title, text):
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, text, title, 0x10)
    except Exception:
        pass


if __name__ == "__main__":
    sys.exit(main())
