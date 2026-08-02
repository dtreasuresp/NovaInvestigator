@echo off
setlocal EnableExtensions
title Analisis Estrategico - Servidor (no cerrar esta ventana)
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
echo ============================================
echo   Analisis Estrategico EFI/EFE/DAFO/CAME
echo ============================================
echo.
echo Iniciando aplicacion...
echo.
"%APP_EXE%"
exit /b %ERRORLEVEL%
