#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
开机自启动设置（注册表 HKCU\\...\\Run）。
用法：
  python setup_autostart.py on     # 启用开机自启
  python setup_autostart.py off    # 取消开机自启
  python setup_autostart.py status # 查看当前状态
"""
import os
import sys
import subprocess

# 桌宠入口（用 pythonw，无黑窗）
PET_PY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "deepseek_pet.py")
RUN_KEY = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run"
VAL_NAME = "DeepSeekPet"


def reg_query():
    r = subprocess.run(
        ["reg", "query", RUN_KEY, "/v", VAL_NAME], capture_output=True, text=True)
    return r.returncode == 0, r.stdout


def reg_set(cmdline):
    r = subprocess.run(
        ["reg", "add", RUN_KEY, "/v", VAL_NAME, "/t", "REG_SZ", "/d", cmdline,
         "/f"], capture_output=True, text=True)
    return r.returncode == 0, r.stdout + r.stderr


def reg_del():
    r = subprocess.run(
        ["reg", "delete", RUN_KEY, "/v", VAL_NAME, "/f"],
        capture_output=True, text=True)
    return r.returncode == 0, r.stdout + r.stderr


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "status"
    pyw = os.path.join(os.path.dirname(sys.executable), "pythonw.exe")
    if not os.path.exists(pyw):
        pyw = sys.executable
    cmd = f'"{pyw}" "{PET_PY}"'

    if action == "on":
        ok, out = reg_set(cmd)
        print("已设置开机自启动：", cmd)
        print(out.strip())
    elif action == "off":
        ok, out = reg_del()
        print("已取消开机自启动。")
        print(out.strip())
    else:
        ok, out = reg_query()
        if ok:
            for line in out.splitlines():
                if VAL_NAME in line:
                    print("状态：已启用 ->", line.strip())
                    break
        else:
            print("状态：未启用开机自启动")


if __name__ == "__main__":
    main()
