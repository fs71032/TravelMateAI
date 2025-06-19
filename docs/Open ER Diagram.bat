@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-er-diagram.ps1"
if errorlevel 1 pause
