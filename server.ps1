# Tiny local web server for the plate poem prototype.
# Serves this folder at http://localhost:8765 so the page can talk to Ollama.
param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$port = 8765
# Already running (say, from an earlier double-click)? Just open the page.
try {
  Invoke-WebRequest "http://localhost:$port/api/images" -UseBasicParsing -TimeoutSec 2 | Out-Null
  Write-Host "Plate poems is already running. Opening it in your browser."
  if (-not $NoBrowser) { Start-Process "http://localhost:$port/" }
  exit
} catch {}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Plate poems running at http://localhost:$port  (close this window to stop)"
if (-not $NoBrowser) { Start-Process "http://localhost:$port/" }

$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript'; '.css'='text/css'; '.json'='application/json';
            '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.png'='image/png'; '.webp'='image/webp'; '.gif'='image/gif' }
$imageExts = '.jpg','.jpeg','.png','.webp','.gif'

function Send($ctx, $code, $type, [byte[]]$bytes) {
  $ctx.Response.StatusCode = $code
  $ctx.Response.ContentType = $type
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.Close()
}
function SendText($ctx, $code, $type, $text) { Send $ctx $code $type ([Text.Encoding]::UTF8.GetBytes($text)) }

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/api/images') {
      $names = @(Get-ChildItem -LiteralPath $root -File | Where-Object { $imageExts -contains $_.Extension.ToLower() } |
        Sort-Object Name | ForEach-Object { $_.Name })
      SendText $ctx 200 'application/json' (ConvertTo-Json -InputObject $names)
    }
    elseif ($path -eq '/api/save' -and $ctx.Request.HttpMethod -eq 'POST') {
      $reader = New-Object IO.StreamReader($ctx.Request.InputStream, [Text.Encoding]::UTF8)
      [IO.File]::WriteAllText((Join-Path $root 'plates.json'), $reader.ReadToEnd(), [Text.Encoding]::UTF8)
      SendText $ctx 200 'application/json' '{"ok":true}'
    }
    else {
      if ($path -eq '/') { $path = '/index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
      if ($file.StartsWith($root) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
        $type = $types[[IO.Path]::GetExtension($file).ToLower()]
        if (-not $type) { $type = 'application/octet-stream' }
        Send $ctx 200 $type ([IO.File]::ReadAllBytes($file))
      } else {
        SendText $ctx 404 'text/plain' 'Not found'
      }
    }
  } catch {
    try { SendText $ctx 500 'text/plain' $_.Exception.Message } catch {}
  }
}
