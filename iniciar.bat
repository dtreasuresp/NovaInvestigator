@echo off
setlocal EnableExtensions
title Analisis Estrategico - Servidor (no cerrar esta ventana)
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

echo.
echo Iniciando aplicacion...
echo.
"%PYTHON_EXE%" %PYTHON_ARGS% "%PROJECT_DIR%server.py"
set "EXIT_CODE=%ERRORLEVEL%"
exit /b %EXIT_CODE%

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
