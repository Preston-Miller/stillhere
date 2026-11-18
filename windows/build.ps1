# Builds Stillhere for Windows: build\win\Stillhere\ (the app folder) and build\win\Stillhere-Setup-<ver>.exe.
# Runs on Windows (GitHub Actions: .github/workflows/windows.yml). Needs Python 3.11 and Inno Setup 6 (iscc).
#
#   powershell -File windows\build.ps1            full build + installer
#   powershell -File windows\build.ps1 -NoInstaller   app folder only (faster, for testing)
param([switch]$NoInstaller)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Version = if (Test-Path desktop\VERSION) { (Get-Content desktop\VERSION).Trim() } else { '0.1.0' }
# Pinned to the same Ollama as the Mac build (desktop/build.sh copies /Applications/Ollama.app, 0.40.16 on 2026-11-18).
$OllamaVersion = if ($env:OLLAMA_VERSION) { $env:OLLAMA_VERSION } else { 'v0.40.16' }
$Out = "$Root\build\win"
$App = "$Out\Stillhere"
New-Item -ItemType Directory -Force $Out | Out-Null

Write-Host "• Python packages"
python -m pip install --quiet --disable-pip-version-check pyinstaller==6.22.3 pypdf==7.1.0 pywebview pillow

Write-Host "• icon"
python -c "from PIL import Image; Image.open(r'windows\icon.png').save(r'$Out\icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])"

Write-Host "• app (PyInstaller)"
if (Test-Path $App) { Remove-Item -Recurse -Force $App }
# The server is imported by the launcher at run time, so name it (and its siblings) for PyInstaller to collect.
python -m PyInstaller --noconfirm --clean --log-level WARN --windowed --name Stillhere --icon "$Out\icon.ico" `
  --distpath $Out --workpath "$Out\pyi-work" --specpath "$Out" `
  --paths app --add-data "$Root\app\static;static" `
  --hidden-import server --hidden-import library --hidden-import maps --hidden-import userdocs `
  --hidden-import videos --hidden-import firstrun --hidden-import models --hidden-import paths `
  --hidden-import build_index --hidden-import pypdf `
  windows\launcher.py
if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }

Write-Host "• library"
$L = "$App\library"
New-Item -ItemType Directory -Force $L | Out-Null
Copy-Item app\data\library.sqlite $L
Copy-Item -Recurse reference-sources $L
if (Test-Path knowledge) { Copy-Item -Recurse knowledge $L }

Write-Host "• Ollama $OllamaVersion"
$Zip = "$Out\ollama-windows-amd64-$OllamaVersion.zip"
if (-not (Test-Path $Zip)) {
  Invoke-WebRequest -UseBasicParsing "https://github.com/ollama/ollama/releases/download/$OllamaVersion/ollama-windows-amd64.zip" -OutFile $Zip
}
Expand-Archive -Force $Zip "$App\ollama"
if (-not (Test-Path "$App\ollama\ollama.exe")) { throw "ollama.exe missing from the Ollama download" }
# Ollama ships two NVIDIA builds (~1.1 GB + ~0.9 GB). Keep CUDA 12 only: it covers older cards and older drivers too
# (CUDA 13 needs a 2025+ driver and drops pre-Turing cards). Ollama falls back to CUDA 12 on its own.
if ((Test-Path "$App\ollama\lib\ollama\cuda_v12") -and (Test-Path "$App\ollama\lib\ollama\cuda_v13")) {
  Remove-Item -Recurse -Force "$App\ollama\lib\ollama\cuda_v13"
}
Write-Host "  Ollama folder sizes (MB):"
Get-ChildItem "$App\ollama\lib\ollama" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $mb = [math]::Round((Get-ChildItem $_.FullName -Recurse -File | Measure-Object Length -Sum).Sum / 1MB)
  Write-Host "    $($_.Name): $mb"
}

Write-Host "• config"
$Maps = if (Test-Path desktop\MAPS_URL) { (Get-Content desktop\MAPS_URL).Trim() } else { '' }
@{ maps_source = $Maps; version = $Version } | ConvertTo-Json | Set-Content -Encoding UTF8 "$App\config.json"

$mb = [math]::Round((Get-ChildItem $App -Recurse -File | Measure-Object Length -Sum).Sum / 1MB)
Write-Host "  app folder: $mb MB"

if (-not $NoInstaller) {
  Write-Host "• installer (Inno Setup)"
  $iscc = (Get-Command iscc -ErrorAction SilentlyContinue).Source
  if (-not $iscc) { $iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe" }
  if (-not (Test-Path $iscc)) { choco install innosetup -y --no-progress | Out-Null; $iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe" }
  & $iscc /Q "/DMyAppVersion=$Version" "/DSourceDir=$App" "/DOutDir=$Out" "/DIconFile=$Out\icon.ico" windows\stillhere.iss
  if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed" }
  Get-Item "$Out\Stillhere-Setup-$Version.exe" | ForEach-Object { Write-Host "✓ $($_.Name) ($([math]::Round($_.Length/1MB)) MB)" }
}
Write-Host "✓ $App"
