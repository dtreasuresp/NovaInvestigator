@echo off
setlocal EnableExtensions
set "PACKAGE_DIR=%~dp0"
set "APP_DIR=%PACKAGE_DIR%AnalisisEstrategico"
set "APP_EXE=%APP_DIR%\AnalisisEstrategico.exe"
set "PORT_FILE=%TEMP%\analisis_estrategico_port.txt"

if not exist "%APP_EXE%" (
    echo ERROR: No se encontro la aplicacion portable.
    echo Ejecute preparar_portable_offline.bat en el equipo de preparacion.
    pause
    exit /b 1
)

del "%PORT_FILE%" >nul 2>&1
cd /d "%APP_DIR%"
set "OPEN_BROWSER=0"
set "PORT_FILE=%PORT_FILE%"
start "Analisis Estrategico" "%APP_EXE%"

echo Esperando a que la aplicacion arranque...
set "PORT="
set /a ATTEMPTS=0
:waitport
if exist "%PORT_FILE%" goto :gotport
set /a ATTEMPTS+=1
if %ATTEMPTS% GEQ 60 (
    echo.
    echo ============================================
    echo ERROR: La aplicacion no arranco en tiempo.
    echo ============================================
    pause
    exit /b 1
)
ping -n 2 127.0.0.1 >nul
goto :waitport

:gotport
set /p PORT=<"%PORT_FILE%"
if not defined PORT (
    echo ERROR: No se pudo leer el puerto de la aplicacion.
    pause
    exit /b 1
)

echo Comprobando el servidor...
set /a ATTEMPTS=0
:waithealth
set /a ATTEMPTS+=1
if %ATTEMPTS% GEQ 20 goto :healthfail
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri 'http://127.0.0.1:%PORT%/api/health') | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto :healthy
ping -n 2 127.0.0.1 >nul
goto :waithealth

:healthfail
echo.
echo AVISO: El servidor no respondio a la comprobacion.
echo Abriendo el navegador de todas formas.
echo.
goto :open

:healthy
echo.
echo ============================================
echo   La aplicacion se abrira en tu navegador
echo   en 10 segundos.
echo.
echo   Presiona cualquier tecla para abrirla
echo   ahora, sin esperar los 10 segundos.
echo ============================================
echo.
timeout /t 10 >nul 2>&1

:open
start "" "http://localhost:%PORT%/setup"
exit /b 0
