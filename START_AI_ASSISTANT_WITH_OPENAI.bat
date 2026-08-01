@echo off
setlocal

cd /d "%~dp0saas-app"

echo ProjectManagerWeb AI Assistant with ChatGPT
echo.
echo This starts:
echo - AI Secretary server on http://127.0.0.1:8787
echo - SaaS app preview through Vite
echo.
echo Your OpenAI API key is used only in these terminal windows.
echo It is not written into the browser app.
echo.

if "%OPENAI_API_KEY%"=="" (
  set /p OPENAI_API_KEY=Paste OPENAI_API_KEY for this session: 
)

start "ProjectManagerWeb AI Secretary" cmd /k "cd /d %cd% && set OPENAI_API_KEY=%OPENAI_API_KEY%&& npm.cmd run ai:server"

echo.
echo Starting the app. Keep both terminal windows open while testing.
echo.
echo Open this URL in your browser:
echo http://127.0.0.1:5173/
echo.
npm.cmd run dev -- --host 127.0.0.1

echo.
echo App server stopped. You can close the AI Secretary window too.
pause >nul
