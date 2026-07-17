@echo off
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

if not exist "node_modules\" (
    echo [Setup] Installing dependencies...
    call npm install --silent
)

if not exist "dist\cli\index.js" (
    echo [Setup] Building project...
    call npx tsc
)

node "%PROJECT_DIR%dist\cli\index.js" %*