@echo off
title Sewerage Section Management System - Standalone
echo ===================================================
echo [下水道科地理資訊與業務管理系統 - 單機版啟動]
echo ===================================================

:: Check for Node.js
where node >down 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 找不到 Node.js！請先安裝 Node.js (v18+)。
    echo 下載路徑: https://nodejs.org/
    pause
    exit /b
)

:: Install production dependencies if node_modules is missing
if not exist "node_modules" (
    echo [提示] 第一次執行，正在準備必要組件...
    npm install --production
)

:: Launch the server
echo [提示] 系統正在啟動中，請稍候...
echo [提示] 啟動完成後，瀏覽器將自動開啟至 http://localhost:3000

:: In a real standalone build, we'd run 'node server.js' from the .next/standalone folder
:: For this development hand-off, 'npm run start' is the safest portable choice.
start "" "http://localhost:3000"
npm run start

pause
