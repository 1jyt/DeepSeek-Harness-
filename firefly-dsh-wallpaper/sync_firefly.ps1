# Wallpaper sync script.
# Scans a folder with images and copies them into dist\assets\firefly-bg\
# as firefly-1..N.ext, then writes firefly-list.json for the webpage.
# Re-running clears old firefly-* images and rebuilds from current folder contents.
#
# Usage:
#   powershell -File sync_firefly.ps1 -FOLDER "C:\path\to\images"
param(
  [string]$FOLDER = 'C:\Users\Lenovo\Desktop\ai\...'
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($FOLDER)) { throw 'Missing -FOLDER path' }

# Wallpaper resource dir (served as static assets).
$real = "C:\Users\Lenovo\Documents\Codex\2026-08-13\new-chat\work\dsh-app\node_modules\.pnpm\@deepseek-ai+dsh-web-fronte_60b025f1ef416b8668f0ecd83724cac4\node_modules\@deepseek-ai\dsh-web-frontend\dist"
$DEST = Join-Path $real 'assets\firefly-bg'

if (-not (Test-Path $FOLDER)) { throw "Source folder not found: $FOLDER" }
if (-not (Test-Path $real))   { throw "dist dir not found: $real" }

$exts = @('.png','.jpg','.jpeg','.gif','.webp','.bmp')

$files = Get-ChildItem -Path $FOLDER -File | Where-Object { $exts -contains $_.Extension.ToLowerInvariant() } | Sort-Object Name

if ($files.Count -eq 0) { throw "No images in folder: $FOLDER" }

if (Test-Path $DEST) {
  Get-ChildItem -Path $DEST -File | Where-Object { $_.Name -like 'firefly-*' } | Remove-Item -Force
} else {
  New-Item -ItemType Directory -Force -Path $DEST | Out-Null
}

$list = New-Object System.Collections.Generic.List[string]
$i = 0
foreach ($f in $files) {
  $i++
  $ext = $f.Extension.ToLowerInvariant()
  $newName = "firefly-$i$ext"
  Copy-Item -Path $f.FullName -Destination (Join-Path $DEST $newName) -Force
  $list.Add("/assets/firefly-bg/$newName")
  Write-Output ("synced: {0} -> {1}" -f $f.Name, $newName)
}

$a_files = @($list)
$json = (New-Object PSObject) | Add-Member -PassThru -MemberType NoteProperty -Name folder -Value $FOLDER
$json | Add-Member -NotePropertyName count -NotePropertyValue $a_files.Count
$json | Add-Member -NotePropertyName files -NotePropertyValue $a_files
$json | Add-Member -NotePropertyName time -NotePropertyValue (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
$jsonStr = $json | ConvertTo-Json -Depth 3

# Write as UTF-8 WITHOUT BOM so the browser JSON.parse() works cleanly.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $DEST 'firefly-list.json'), $jsonStr, $utf8NoBom)

Write-Output "--------------------------------------------"
Write-Output ("Total synced: {0} -> {1}" -f $a_files.Count, $DEST)
Write-Output "Manifest: firefly-list.json"
Write-Output "Refresh the chat page to see the new wallpapers."
