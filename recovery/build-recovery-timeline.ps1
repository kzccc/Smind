$root = 'D:\Smind\recovery\edge-indexeddb'
$out = 'D:\Smind\recovery\recovery-timeline.csv'
$rows = @()
Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object {
  $path = $_.FullName
  try { $bytes = [IO.File]::ReadAllBytes($path) } catch { return }
  foreach ($encodingName in @('utf8','bigendian')) {
    $encoding = if ($encodingName -eq 'bigendian') { [Text.Encoding]::BigEndianUnicode } else { [Text.Encoding]::UTF8 }
    $text = $encoding.GetString($bytes)
    $matches = [regex]::Matches($text, 'savedAt.{0,80}?((?:20[0-9][0-9])-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+Z)')
    foreach ($match in $matches) {
      $stamp = $match.Groups[1].Value
      $window = $text
      $rows += [pscustomobject]@{
        SavedAt = $stamp
        Source = $path
        Encoding = $encodingName
        HasCodeBlock = $window.Contains('detail-code-block')
        HasPointBlock = $window.Contains('detail-point-block')
        HasStyledHtml = $window.Contains('background-color') -or $window.Contains('color:')
      }
    }
  }
}
$rows | Sort-Object @{Expression={ [DateTime]$_.SavedAt }; Descending=$true}, Source, Encoding | Export-Csv -LiteralPath $out -NoTypeInformation -Encoding UTF8
Write-Output "WROTE=$out ROWS=$($rows.Count)"
