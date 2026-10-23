@echo off
TITLE Job Application Tracker Launcher
echo ========================================================
echo   Starting Job Application Tracker Full-Stack Environment
echo ========================================================

cd /d "D:\job tracking"

echo [1/2] Starting Spring Boot Backend (Port 8080)...
start cmd /k "mvnw.cmd spring-boot:run"

echo [2/2] Opening Project in VS Code (Ready for Live Server)...
start code .

echo ========================================================
echo   Backend is launching in a new window!
echo   To launch frontend: Click 'Go Live' in VS Code (Port 5500).
echo ========================================================
pause