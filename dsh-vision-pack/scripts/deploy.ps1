# ============================================================
# DSH Vision Pack - one-click deploy script (v2, preflight + dry-run)
# Usage (run inside the extracted project folder):
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1 -DryRun   # check only, changes nothing
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1           # backup -> install -> merge
# Idempotent: safe to run repeatedly. Every change is backed up first.
# ============================================================
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
$PACK_VERSION = '2.0.0'

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$profileDir = Join-Path $dshHome 'profiles\web'
$pluginsDir = 'D:\dsh-plugins'
$workspaceRoot = 'D:\your\workspace'
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'

$fails = 0
function Report($ok, $msg) {
  if ($ok) { Write-Host "  [OK] $msg" } else { Write-Host "  [FAIL] $msg"; $script:fails++ }
}

Write-Host "== DSH Vision Pack deploy v$PACK_VERSION $(if ($DryRun) { '(DRY RUN - no changes)' } else { '' }) =="
Write-Host "DSH_HOME    : $dshHome"
Write-Host "profile dir : $profileDir"

# ---------- PREFLIGHT ----------
Write-Host ''
Write-Host '[Preflight] checks ...'
Report (Test-Path $profileDir) "DSH profile exists: $profileDir"
$patchPath = Join-Path $profileDir 'cordis.patch.yml'
$pkgPath   = Join-Path $profileDir 'package.json'
$settings  = Join-Path $dshHome 'settings.yaml'
Report (Test-Path $patchPath) "cordis.patch.yml exists"
Report (Test-Path $pkgPath)   "package.json exists"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  $cand = Get-ChildItem "$env:USERPROFILE\.cache\codex-runtimes" -Recurse -Filter 'node.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cand) { $node = $cand.FullName }
}
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
  $cand = Get-ChildItem "$env:USERPROFILE\.cache\codex-runtimes" -Recurse -Filter 'pnpm.cjs' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like '*pnpm\bin\pnpm.cjs' } | Select-Object -First 1
  if ($cand) { $pnpm = $cand.FullName }
}
Report ($null -ne $node) 'node available (PATH or DSH runtime)'
Report ($null -ne $pnpm) 'pnpm available (PATH or DSH runtime)'
$pluginOk = $true
foreach ($p in @('tool-analyze-image', 'ollama-lifecycle')) {
  if (-not (Test-Path (Join-Path $PSScriptRoot "..\plugins\$p\package.json"))) { $pluginOk = $false; Report $false "plugin source present: $p" }
}
if ($pluginOk) { Report $true 'plugin sources present in this package' }
try { New-Item -ItemType Directory -Force -Path $pluginsDir -ErrorAction Stop | Out-Null; Report $true "plugins dir writable: $pluginsDir" } catch { Report $false "plugins dir writable: $pluginsDir ($($_.Exception.Message))" }
$patchRaw = if (Test-Path $patchPath) { Get-Content $patchPath -Raw } else { '' }
$pkgRaw = if (Test-Path $pkgPath) { Get-Content $pkgPath -Raw } else { '' }
$already = $patchRaw -match 'tool-analyze-image' -and $pkgRaw -match 'tool-analyze-image'
if ($already) { Write-Host '  [INFO] vision plugins already registered (idempotent - rerun is safe)' }

if ($fails -gt 0) {
  Write-Host ''
  Write-Host "== PREFLIGHT FAILED: $fails problem(s). Fix them, then rerun. Nothing was changed. =="
  exit 1
}
if ($DryRun) {
  Write-Host ''
  Write-Host '== DRY RUN COMPLETE: all checks passed, nothing was modified. =='
  Write-Host 'Rerun without -DryRun to actually install.'
  exit 0
}

# ---------- BACKUP ----------
Write-Host ''
Write-Host '[1/5] Backing up configs ...'
foreach ($f in @($patchPath, $pkgPath, $settings)) {
  if (Test-Path $f) {
    $bak = "$f.bak-$ts"
    Copy-Item $f $bak -Force
    Write-Host "  backed up: $f -> $bak"
  }
}

# ---------- COPY PLUGINS ----------
Write-Host ''
Write-Host '[2/5] Copying plugins ...'
New-Item -ItemType Directory -Force -Path $pluginsDir | Out-Null
foreach ($p in @('tool-analyze-image', 'ollama-lifecycle')) {
  Copy-Item (Join-Path $PSScriptRoot "..\plugins\$p") (Join-Path $pluginsDir $p) -Recurse -Force
  Write-Host "  copied: $p -> $pluginsDir\$p"
}

# ---------- REGISTER DEPS ----------
Write-Host ''
Write-Host '[3/5] Registering dependencies ...'
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$deps = if ($null -eq $pkg.dependencies) { [ordered]@{} } else { $pkg.dependencies }
$changed = $false
foreach ($pair in @(@('tool-analyze-image', 'file:D:/dsh-plugins/tool-analyze-image'), @('ollama-lifecycle', 'file:D:/dsh-plugins/ollama-lifecycle'))) {
  $name = $pair[0]; $val = $pair[1]
  if (-not $deps.$name) { $deps | Add-Member -NotePropertyName $name -NotePropertyValue $val -Force; $changed = $true }
}
if ($changed) {
  $pkg.dependencies = $deps
  $pkg | ConvertTo-Json -Depth 20 | Set-Content $pkgPath -Encoding UTF8
  Write-Host '  dependencies added'
} else { Write-Host '  dependencies already present, skipped' }

# ---------- PNPM INSTALL ----------
Write-Host ''
Write-Host '[4/5] pnpm install ...'
if (-not $pnpm) {
  $cand = Get-ChildItem "$env:USERPROFILE\.cache\codex-runtimes" -Recurse -Filter 'pnpm.cjs' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like '*pnpm\bin\pnpm.cjs' } | Select-Object -First 1
  if ($cand) { $pnpm = $cand.FullName }
}
if ($pnpm) {
  Push-Location $profileDir
  try {
    if ($pnpm -is [string]) { if ($node) { & $node.Source $pnpm install } else { throw 'node not found' } }
    else { & $pnpm install }
    Write-Host '  pnpm install done'
  } finally { Pop-Location }
} else { Write-Warning 'pnpm not found - run pnpm install manually in the profile dir' }

# ---------- MERGE PATCH ----------
Write-Host ''
Write-Host '[5/5] Merging cordis.patch.yml ...'
$current = Get-Content $patchPath -Raw
$patchBlock = @"

# ==== DSH Vision Pack (tool-analyze-image + ollama-lifecycle) ====
- insert:
    - id: tool-analyze-image
      name: 'tool-analyze-image'
      config:
        workspaceRoot: '$workspaceRoot'
- insert:
    - id: ollama-lifecycle
      name: 'ollama-lifecycle'
      config:
        baseUrl: 'http://127.0.0.1:11434'
        readyTimeoutMs: 20000
        killOnExit: true
"@
if ($current -match 'tool-analyze-image') { Write-Host '  already merged, skipped' }
else { Add-Content -Path $patchPath -Value $patchBlock -Encoding UTF8; Write-Host '  patch entries appended' }

# ---------- DONE ----------
Write-Host ''
Write-Host '== Deploy done. Restart DSH now (run .\scripts\restart-dsh.ps1 or restart the harness). =='
Write-Host ''
Write-Host 'If DSH fails to start, restore the backups created above:'
Write-Host "  1. copy $patchPath.bak-$ts back to $patchPath"
Write-Host "  2. copy $pkgPath.bak-$ts back to $pkgPath"
Write-Host "  3. if settings.yaml was touched, copy $settings.bak-$ts back"
Write-Host '  4. restart DSH'
Write-Host ''
Write-Host 'Post-install checklist:'
Write-Host '  - Ollama running?  http://127.0.0.1:11434/api/version'
Write-Host '  - analyze_image tool visible in DSH? (ask the assistant)'
Write-Host '  - drag an image + ask -> vision analysis appears'