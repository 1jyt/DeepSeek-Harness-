@echo off
title DSH Vision Pack Installer
echo ============================================================
echo   DSH Vision Pack - one-click installer
echo   (vision: drag image + ask, Ollama auto lifecycle)
echo ============================================================
echo.
cd /d "%~dp0"

echo [1/3] Preflight check (dry run - changes nothing)...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy.ps1" -DryRun
if errorlevel 1 (
  echo.
  echo  [ERROR] Preflight FAILED. Read the [FAIL] lines above, fix them,
  echo          then double-click this file again. Nothing was changed.
  echo.
  pause
  exit /b 1
)
echo.
echo [2/3] Installing (backup - copy plugins - pnpm install - merge config)...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy.ps1"
if errorlevel 1 (
  echo.
  echo  [ERROR] Install step failed. The deploy script printed how to
  echo          restore backups. Fix and rerun.
  echo.
  pause
  exit /b 1
)
echo.
echo ============================================================
echo   [3/3] INSTALL DONE.
echo.
echo   Next steps:
echo     1. Restart DeepSeek Harness (close and reopen it).
echo     2. Ollama will start automatically with DSH.
echo     3. The analyze_image tool is now available.
echo     4. Test: drag an image into the chat + ask a question
echo        -> local Qwen2.5-VL analyzes it, DeepSeek answers.
echo.
echo   Uninstall: see README.md section "Uninstall".
echo ============================================================
echo.
pause
