$ErrorActionPreference = 'Stop'
$gameRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$gameUrl = 'http://127.0.0.1:3010/?practice=noble'
$gameIsRunning = $false
try {
    $gameHealth = Invoke-WebRequest -Uri 'http://127.0.0.1:3010/healthz' -TimeoutSec 2 -UseBasicParsing
    $gameIsRunning = $gameHealth.StatusCode -eq 200 -and $gameHealth.Content.Trim() -eq 'ok'
} catch { }
if (-not $gameIsRunning) {
    $gameNode = (Get-Command node -ErrorAction Stop).Source
    $env:PORT = '3010'
    Start-Process -FilePath $gameNode -ArgumentList @('server.js') -WorkingDirectory $gameRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'local-server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'local-server-error.log') | Out-Null
}
Write-Output $gameUrl
