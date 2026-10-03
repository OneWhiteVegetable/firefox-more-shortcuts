@echo off
if not "%~1"=="" (echo %*)> "%TEMP%\mst_ffdir.txt"
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1" "%~1"
pause
