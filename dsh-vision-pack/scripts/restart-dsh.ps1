# Delayed DSH web server restart (vision-bridge patch + plugin reload).
$ErrorActionPreference = 'Stop'
$delay = if ($args.Count -gt 0) { [int]$args[0] } else { 30 }
Start-Sleep -Seconds $delay

$node = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$app = 'C:\Users\Lenovo\Documents\Codex\2026-08-13\new-chat\work\dsh-app'
$bin = Join-Path $app 'node_modules\@deepseek-ai\dsh\lib\bin.js'
$out = Join-Path $app 'dsh.out.log'
$err = Join-Path $app 'dsh.err.log'
$result = 'D:\111\ds\0\dsh-restart-result.txt'

$conn = Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  Stop-Process -Id $conn[0].OwningProcess -Force
  Start-Sleep -Seconds 3
}

Start-Process -FilePath $node -ArgumentList @($bin, 'web', '--host', '127.0.0.1', '--port', '3080') `
  -WorkingDirectory $app -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err

$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 500
  $c = Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue
  if ($c) { $ok = $true; break }
}
if ($ok) { Set-Content -Path $result -Value "restarted OK, pid $($c[0].OwningProcess)" } else { Set-Content -Path $result -Value 'RESTART FAILED' }
