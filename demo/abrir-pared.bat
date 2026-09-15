@echo off
chcp 65001 >nul
cd /d "%~dp0"
title EcoTrack - pared de demostracion
node servidor.mjs
echo.
echo El servidor se detuvo.
pause
