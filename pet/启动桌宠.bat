@echo off
chcp 65001 >nul
rem -------------------------------------------------------------
rem  DeepSeek 桌宠  - 启动器
rem  使用系统自带的 Python + tkinter，无需安装任何依赖
rem  双击本文件即可启动桌宠
rem -------------------------------------------------------------
cd /d "%~dp0"

rem 若之前有残留进程则先关闭
taskkill /IM python.exe /FI "WINDOWTITLE eq DeepSeek Pet*" >nul 2>&1

rem 启动桌宠（后台运行，隐藏控制台）
start "" pythonw.exe "%~dp0deepseek_pet.py"

timeout /t 2 >nul
exit /b 0
