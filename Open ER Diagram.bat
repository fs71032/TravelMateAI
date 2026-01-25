@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0docs\open-er-diagram.ps1"
if errorlevel 1 pause
