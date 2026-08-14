# 用 PyInstaller 把 launcher.py 封装成单文件 exe（无控制台窗口）
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir

python -m PyInstaller `
  --noconfirm `
  --clean `
  --onefile `
  --noconsole `
  --name "DeepSeek Harness" `
  --icon "app.ico" `
  --version-file "version_info.txt" `
  --add-data "launcher_config.json;." `
  "launcher.py"

if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed with exit $LASTEXITCODE" }

Write-Output "Built: $dir\dist\DeepSeek Harness.exe"
