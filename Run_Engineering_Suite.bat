@echo off
title Engineering Suite Launcher
cd /d "%~dp0"

echo Launching Standalone Engineering Suite...
python standalone_app.py

if %ERRORLEVEL% NEQ 0 (
    echo Python not found, trying Node.js...
    node offline_runner.js
)
pause
