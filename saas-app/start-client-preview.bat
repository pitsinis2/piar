@echo off
setlocal
cd /d "%~dp0"

echo.
echo Project Manager client preview
echo --------------------------------
echo This starts a temporary preview server on this PC.
echo Keep this window open while testing from browser or phone.
echo.

if exist "appback.js" (
  if not exist "public" mkdir "public"
  copy /Y "appback.js" "public\appback.js" >nul
)

for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$route=Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1; $ip=$null; if($route){$cfg=Get-NetIPConfiguration -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue; $ip=$cfg.IPv4Address | Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' } | Select-Object -First 1 -ExpandProperty IPAddress}; if(-not $ip){$ip=Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.AddressState -eq 'Preferred' -and $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' } | Select-Object -First 1 -ExpandProperty IPAddress}; if($ip){$ip}else{'YOUR-PC-IP'}"`) do set LOCAL_IP=%%i

set PHONE_URL=http://%LOCAL_IP%:5173
for /f "usebackq tokens=*" %%t in (`powershell -NoProfile -Command "[DateTimeOffset]::Now.ToUnixTimeSeconds()"`) do set PREVIEW_VERSION=%%t
set PC_URL=http://localhost:5173/?demo=client^&preview=%PREVIEW_VERSION%
set PHONE_URL_VERSIONED=http://%LOCAL_IP%:5173/?demo=client^&preview=%PREVIEW_VERSION%
echo %PHONE_URL_VERSIONED%> phone-preview-url.txt

echo PC preview:
echo   %PC_URL%
echo.
echo Phone preview on same WiFi:
echo   %PHONE_URL_VERSIONED%
echo.
echo The phone link was also saved here:
echo   %CD%\phone-preview-url.txt
echo.
echo If the phone cannot open it, Windows Firewall may ask to allow Node.js.
echo.

start "" "%PC_URL%"
npm.cmd run dev -- --host 0.0.0.0

pause
