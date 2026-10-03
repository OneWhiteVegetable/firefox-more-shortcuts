# Firefox 快捷方式扩容 - 安装脚本（由 安装.bat 调用，需管理员）
$ErrorActionPreference = "Stop"
$log = Join-Path $env:TEMP "mst_setup.log"
"=== $(Get-Date) 安装开始 ===" | Out-File $log -Encoding utf8

function Log($msg) {
  Write-Host $msg
  $msg | Out-File $log -Append -Encoding utf8
}

try {
  $src = Split-Path -Parent $MyInvocation.MyCommand.Path

  # ---------- Firefox 安装目录（参数优先，其次安装.bat 的交接文件） ----------
  $ffDir = "C:\Program Files\Mozilla Firefox"
  if ($args.Count -gt 0 -and $args[0]) { $ffDir = $args[0] }
  # UAC 提权重启会丢参数，安装.bat 先把自定义路径写入临时交接文件
  $handoff = Join-Path $env:TEMP "mst_ffdir.txt"
  if (Test-Path $handoff) {
    $f = Get-Item $handoff
    if ((Get-Date) - $f.LastWriteTime -lt [TimeSpan]::FromMinutes(10)) {
      $ffDir = (Get-Content $handoff -Raw).Trim().Trim('"')
    }
    Remove-Item $handoff -Force
  }
  if (-not [System.IO.File]::Exists((Join-Path $ffDir "firefox.exe"))) {
    Log "[错误] 未找到 $ffDir\firefox.exe"
    Log "如果 Firefox 装在其他位置：把 Firefox 安装文件夹拖到 安装.bat 上，"
    Log "或在 PowerShell 中运行: setup.ps1 'D:\你的\Firefox目录'"
    exit 1
  }
  Log "Firefox 目录: $ffDir"

  # ---------- 配置文件目录（解析 profiles.ini 中 [Install*] 段的 Default=Profiles/...） ----------
  $ini = Join-Path $env:APPDATA "Mozilla\Firefox\profiles.ini"
  $profRel = $null
  foreach ($line in Get-Content $ini) {
    if ($line -match "^Default=(Profiles/.+)$") { $profRel = $Matches[1].Trim() }
  }
  if (-not $profRel) {
    Log "[错误] 无法从 profiles.ini 解析默认配置文件，请按 使用说明.txt 手动复制。"
    exit 1
  }
  $prof = Join-Path (Join-Path $env:APPDATA "Mozilla\Firefox") ($profRel -replace "/", "\")
  if (-not (Test-Path $prof)) {
    Log "[错误] 配置文件目录不存在: $prof"
    exit 1
  }
  Log "配置文件目录: $prof"
  if (Test-Path (Join-Path $prof "parent.lock")) {
    Log "[提示] Firefox 似乎正在运行，建议关闭后再装（文件仍会照常复制）。"
  }

  # ---------- 复制文件 ----------
  Copy-Item -LiteralPath (Join-Path $src "program\config.js") -Destination (Join-Path $ffDir "config.js") -Force
  $prefDir = Join-Path $ffDir "defaults\pref"
  New-Item -ItemType Directory -Force $prefDir | Out-Null
  Copy-Item -LiteralPath (Join-Path $src "program\defaults\pref\config-prefs.js") -Destination (Join-Path $prefDir "config-prefs.js") -Force
  Log "已写入 Firefox 安装目录 (config.js, defaults\pref\config-prefs.js)"

  $chromeDst = Join-Path $prof "chrome"
  Copy-Item -LiteralPath (Join-Path $src "profile\chrome") -Destination $prof -Recurse -Force
  Log "已写入配置文件目录 (chrome\...)"

  # ---------- 合并 user.js（只加两个开关；数量由面板控制，不写死） ----------
  $ujs = Join-Path $prof "user.js"
  if (-not (Test-Path $ujs)) { New-Item -ItemType File $ujs | Out-Null }
  $ujsText = Get-Content $ujs -Raw -ErrorAction SilentlyContinue
  if ($ujsText -notmatch "legacyUserProfileCustomizations\.stylesheets") {
    Add-Content $ujs 'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);' -Encoding utf8
  }
  if ($ujsText -notmatch "userChromeJS\.experimental\.enabled") {
    Add-Content $ujs 'user_pref("userChromeJS.experimental.enabled", true);' -Encoding utf8
  }
  Log "user.js 开关已就绪"

  # ---------- 清理启动缓存 ----------
  Get-ChildItem (Join-Path $env:LOCALAPPDATA "Mozilla\Firefox\Profiles") -Directory -ErrorAction SilentlyContinue |
    ForEach-Object {
      $sc = Join-Path $_.FullName "startupCache"
      if (Test-Path $sc) { Remove-Item $sc -Recurse -Force -ErrorAction SilentlyContinue }
    }
  Log "启动缓存已清理"

  Log ""
  Log "============================================================"
  Log " 安装完成！启动 Firefox 后打开新标签页："
  Log " - 快捷方式默认变为 每行 12 个 x 6 行（你原来的固定网站都在）"
  Log " - 点右下角铅笔按钮，面板里可选 1-8 行、每行 8/10/12/14/16 个"
  Log " 日志: $log"
  Log "============================================================"
} catch {
  Log "[错误] 安装中断: $_"
  exit 1
}
