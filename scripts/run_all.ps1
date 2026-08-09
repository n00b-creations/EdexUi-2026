<#
.SYNOPSIS
  Run-all PowerShell helper for Windows.
  Installs dependencies, starts ASR demo (optional), and launches the app.
.
USAGE
  .\scripts\run_all.ps1       # starts ASR demo + app
  .\scripts\run_all.ps1 -NoASR  # starts only the app
#>
param(
  [switch]$NoASR
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location (Join-Path $scriptDir '..')

Write-Host "[run_all.ps1] Installing root npm dependencies..."
npm install

if (Test-Path .\src) {
  Write-Host "[run_all.ps1] Installing UI/runtime deps in src (three, ws)..."
  Push-Location .\src
  npm install three ws
  Pop-Location
} else {
  Write-Host "[run_all.ps1] Warning: src\ directory not found"
}

if (-not (Test-Path .\logs)) { New-Item -ItemType Directory -Path .\logs | Out-Null }

if (-not $NoASR) {
  Write-Host "[run_all.ps1] Starting ASR demo server in background (logs\\asr.log)..."
  $out = Start-Process -FilePath "node" -ArgumentList "scripts/asr_ws_demo.js" -RedirectStandardOutput ".\logs\asr.log" -RedirectStandardError ".\logs\asr.err" -PassThru
  Write-Host "[run_all.ps1] ASR demo started (PID $($out.Id))"
  Write-Host "[run_all.ps1] To stop ASR demo: Stop-Process -Id $($out.Id)"
}

Write-Host "[run_all.ps1] Launching the app (npm start) ..."
Start-Process -FilePath "npm" -ArgumentList "start"
