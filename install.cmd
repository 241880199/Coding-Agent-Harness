@echo off
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "TARGET_DIR=%APPDATA%\npm"

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

copy /y "%PROJECT_DIR%harness.cmd" "%TARGET_DIR%\harness.cmd" >nul 2>&1

echo.
echo ========================================
echo   harness.cmd installed to:
echo   %TARGET_DIR%\harness.cmd
echo ========================================
echo.
echo   Now you can run 'harness' from anywhere:
echo.
echo     harness start "your task"
echo     harness config set-key
echo     harness
echo.
echo   NOTE: Keep this project directory in place.
echo   The harness.cmd references it via absolute path.
echo.
pause