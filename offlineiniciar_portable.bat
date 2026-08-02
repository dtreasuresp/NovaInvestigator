@echo off
setlocal EnableExtensions
set "PACKAGE_DIR=%~dp0"
set "APP_DIR=%PACKAGE_DIR%AnalisisEstrategico"
set "APP_EXE=%APP_DIR%\AnalisisEstrategico.exe"

if not exist "%APP_EXE%" (
    echo ERROR: No se encontro la aplicacion portable.
    echo Ejecute preparar_portable_offline.bat en el equipo de preparacion.
    pause
    exit /b 1
)

cd /d "%APP_DIR%"
set "OPEN_BROWSER=1"
start "Analisis Estrategico" "%APP_EXE%"
exit /b 0
