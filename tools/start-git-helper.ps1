$ErrorActionPreference = "Stop"
$portInUse = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 32123 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) { exit 0 }
$node = "C:\Program Files\nodejs\node.exe"
$script = "D:\Smind\tools\git-push-server.js"
if (-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $script)) { exit 1 }
Start-Process -FilePath $node -ArgumentList @($script) -WorkingDirectory "D:\Smind" -WindowStyle Hidden
