$log = "D:\Smind\tools\git-helper-startup.log"
try {
  Add-Content -LiteralPath $log -Value ("{0} startup check" -f (Get-Date -Format o))
  $portInUse = netstat -ano | Select-String -Pattern "127\.0\.0\.1:32123\s+.*LISTENING"
  if ($portInUse) { Add-Content -LiteralPath $log -Value "already listening"; exit 0 }
$node = "C:\Program Files\nodejs\node.exe"
$script = "D:\Smind\tools\git-push-server.js"
if (-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $script)) { Add-Content -LiteralPath $log -Value "node or script missing"; exit 1 }
$process = Start-Process -FilePath $node -ArgumentList @($script) -WorkingDirectory "D:\Smind" -WindowStyle Hidden -RedirectStandardOutput "D:\Smind\tools\git-helper.log" -RedirectStandardError "D:\Smind\tools\git-helper-error.log" -PassThru
Add-Content -LiteralPath $log -Value ("started pid={0}" -f $process.Id)
} catch {
  Add-Content -LiteralPath $log -Value ("startup error: {0}" -f $_.Exception.Message)
  exit 1
}
