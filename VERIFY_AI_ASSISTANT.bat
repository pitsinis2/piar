@echo off
setlocal

cd /d "%~dp0saas-app"

echo ProjectManagerWeb AI Assistant verification
echo.
echo This opens the restored SaaS UI in your browser.
echo Keep this window open while testing.
echo If another preview is already running, Vite will choose the next free port.
echo.

npm.cmd run dev -- --host 127.0.0.1 --open /

echo.
echo Server stopped. Press any key to close this window.
pause >nul
