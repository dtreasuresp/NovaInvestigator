@echo off
setlocal EnableExtensions
title Asistente de Configuracion - Analisis Estrategico
color 0A

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"
set "PYTHON_EXE="
set "PYTHON_ARGS="

if exist "%PROJECT_DIR%.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%PROJECT_DIR%.venv\Scripts\python.exe"
) else (
    where py >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=py"
        set "PYTHON_ARGS=-3"
    ) else (
        where python >nul 2>&1
        if not errorlevel 1 set "PYTHON_EXE=python"
    )
)

if not defined PYTHON_EXE (
    echo.
    echo ============================================
    echo ERROR: No se encontro un interprete de Python.
    echo.
    echo Instala Python o prepara la version portable.
    echo ============================================
    pause
    exit /b 1
)

echo ============================================
echo   Analisis Estrategico EFI/EFE/DAFO/CAME
echo ============================================
echo.
echo Interprete seleccionado: %PYTHON_EXE%
echo.

if not exist "%PROJECT_DIR%frontend\dist\index.html" (
    where npm >nul 2>&1
    if not errorlevel 1 (
        echo.
        echo Interfaz de la aplicacion no detectada. Generando build...
        pushd "%PROJECT_DIR%"
        call npm run build
        popd
    ) else (
        echo.
        echo ============================================
        echo AVISO: No se encontro frontend/dist/index.html
        echo y npm no esta disponible para generarlo.
        echo Ejecuta "npm run build" en una maquina con Node.
        echo ============================================
    )
)

"%PYTHON_EXE%" %PYTHON_ARGS% -c "import flask, waitress, matplotlib, numpy, PIL" >nul 2>&1
if errorlevel 1 goto :setup_wizard

echo Iniciando aplicacion...
set "PORT_FILE=%TEMP%\analisis_estrategico_port.txt"
del "%PORT_FILE%" >nul 2>&1
set "OPEN_BROWSER=0"
set "PORT_FILE=%PORT_FILE%"
start "Analisis Estrategico" "%PYTHON_EXE%" %PYTHON_ARGS% "%PROJECT_DIR%server.py"

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
start "" "http://localhost:%PORT%/app/context"
exit /b 0

:setup_wizard
echo.
echo Configuracion inicial requerida. Iniciando asistente...
echo.
"%PYTHON_EXE%" %PYTHON_ARGS% "%PROJECT_DIR%setup_server.py"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
    echo.
    echo ============================================
    echo ERROR: El asistente no pudo iniciarse.
    echo ============================================
    pause
)
exit /b %EXIT_CODE%
