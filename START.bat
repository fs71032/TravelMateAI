@echo off
title TravelMate AI
cd /d "%~dp0"
echo.
echo  TravelMate AI
echo  ==============
echo  Duke nisur backend + frontend...
echo.
echo  IMPORTANT: Hape vetem http://localhost:5173
echo  Mos hap portin 4000 - ai eshte vetem API.
echo.
echo  Mos mbyll kete dritare derisa te punosh me aplikacionin.
echo.
call npm start
if errorlevel 1 (
  echo.
  echo  Gabim gjate nisjes. Provo:
  echo    npm run kill-ports
  echo    npm start
  pause
)
