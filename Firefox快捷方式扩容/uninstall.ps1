# Firefox 快捷方式扩容 - 卸载脚本（由 卸载.bat 调用，需管理员）
$log = Join-Path $env:TEMP "mst_setup.log"
"=== $(Get-Date) 卸载 ===" | Out-File $log -Append -Encoding utf8

function Log($msg) {
  Write-Host $msg
  $msg | Out-File $log -Append -Encoding utf8
}

$ffDir = "C:\Program Files\Mozilla Firefox"
if ($args.Count -gt 0 -and $args[0]) { $ffDir = $args[0] }
$handoff = Join-Path $env:TEMP "mst_ffdir.txt"
if (Test-Path $handoff) {
  $f = Get-Item $handoff
  if ((Get-Date) - $f.LastWriteTime -lt [TimeSpan]::FromMinutes(10)) {
    $ffDir = (Get-Content $handoff -Raw).Trim().Trim('"')
  }
  Remove-Item $handoff -Force
}

Remove-Item (Join-Path $ffDir "config.js") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $ffDir "defaults\pref\config-prefs.js") -Force -ErrorAction SilentlyContinue
Log "已移除 Firefox 安装目录中的加载器入口"

$ini = Join-Path $env:APPDATA "Mozilla\Firefox\profiles.ini"
$profRel = $null
foreach ($line in Get-Content $ini) {
  if ($line -match "^Default=(Profiles/.+)$") { $profRel = $Matches[1].Trim() }
}
if ($profRel) {
  $prof = Join-Path (Join-Path $env:APPDATA "Mozilla\Firefox") ($profRel -replace "/", "\")
  Remove-Item (Join-Path $prof "chrome\userContent.css") -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $prof "chrome\JS\moreShortcuts.uc.js") -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $prof "chrome\JS\MoreShortcuts") -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $prof "chrome\utils") -Recurse -Force -ErrorAction SilentlyContinue
  Log "已移除配置文件中的 chrome 增强文件: $prof"
}

Get-ChildItem (Join-Path $env:LOCALAPPDATA "Mozilla\Firefox\Profiles") -Directory -ErrorAction SilentlyContinue |
  ForEach-Object {
    $sc = Join-Path $_.FullName "startupCache"
    if (Test-Path $sc) { Remove-Item $sc -Recurse -Force -ErrorAction SilentlyContinue }
  }
Log "启动缓存已清理"

Log ""
Log "============================================================"
Log " 卸载完成。注意："
Log " - 行数/每行数量是 Firefox 官方设置，仍保留在你的配置里，无害。"
Log "   如需还原：about:config 搜索 topSitesRows / topSitesMaxSitesPerRow 右键重置。"
Log " - user.js 中两行开关（stylesheets / userChromeJS）如无他用可手动删除。"
Log "============================================================"
