@echo off
setlocal
cd /d "%~dp0"
title 3D Web Paint Local Server

where py >nul 2>&1
if not errorlevel 1 (
  py -3 launch_server.py
  goto :result
)

where python >nul 2>&1
if not errorlevel 1 (
  python launch_server.py
  goto :result
)

echo Python 3 was not found.
echo Install Python from https://www.python.org/downloads/ and try again.
pause
exit /b 1

:result
if errorlevel 1 (
  echo.
  echo The local server could not be started.
  pause
)
