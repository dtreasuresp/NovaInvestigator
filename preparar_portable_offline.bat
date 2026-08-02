@echo off
setlocal EnableExtensions
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"
set "PYTHON_EXE="
set "PYTHON_ARGS="
set "OUTPUT_DIR=%PROJECT_DIR%offline"
set "BUILD_DIR=%PROJECT_DIR%build\pyinstaller"

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
    echo ERROR: No se encontro Python para preparar la distribucion.
    pause
    exit /b 1
)
set "PYTHON_BASE="
"%PYTHON_EXE%" %PYTHON_ARGS% -c "import sys; print(sys.base_prefix)" > "%TEMP%\py_base.tmp" 2>nul
for /f "usebackq delims=" %%F in ("%TEMP%\py_base.tmp") do set "PYTHON_BASE=%%F"
del "%TEMP%\py_base.tmp" >nul 2>&1
rem DLLs de la base Python (conda/python.org) que algunos modulos C necesitan en runtime
rem y que PyInstaller no detecta: ffi (ctypes), libexpat (pyexpat), libssl/libcrypto (ssl),
rem LIBBZ2 (bz2), liblzma (lzma), libmpdec (decimal), sqlite3, libffi.
set "PYINSTALLER_BINARY_ARGS="
for %%F in (
    "%PYTHON_BASE%\DLLs\ffi.dll"
    "%PYTHON_BASE%\Library\bin\ffi.dll"
    "%PYTHON_BASE%\DLLs\ffi-8.dll"
    "%PYTHON_BASE%\DLLs\ffi-7.dll"
    "%PYTHON_BASE%\DLLs\libffi.dll"
    "%PYTHON_BASE%\Library\bin\libffi.dll"
    "%PYTHON_BASE%\Library\bin\LIBBZ2.dll"
    "%PYTHON_BASE%\Library\bin\libcrypto-3-x64.dll"
    "%PYTHON_BASE%\Library\bin\libexpat.dll"
    "%PYTHON_BASE%\Library\bin\liblzma.dll"
    "%PYTHON_BASE%\Library\bin\libmpdec-4.dll"
    "%PYTHON_BASE%\Library\bin\libssl-3-x64.dll"
    "%PYTHON_BASE%\Library\bin\sqlite3.dll"
) do if exist "%%~F" call set "PYINSTALLER_BINARY_ARGS=%%PYINSTALLER_BINARY_ARGS%% --add-binary "%%~F;.""

if not exist "%PROJECT_DIR%frontend\dist\index.html" (
    where npm >nul 2>&1
    if errorlevel 1 (
        echo ERROR: No se encontro frontend\dist ni npm para construirlo.
        pause
        exit /b 1
    )
    call npm run build
    if errorlevel 1 (
        echo ERROR: No se pudo construir el frontend.
        pause
        exit /b 1
    )
)

"%PYTHON_EXE%" %PYTHON_ARGS% -m pip install -r requirements.txt pyinstaller
if errorlevel 1 (
    echo ERROR: No se pudieron instalar las dependencias de preparacion.
    pause
    exit /b 1
)

if exist "%OUTPUT_DIR%\AnalisisEstrategico" rmdir /s /q "%OUTPUT_DIR%\AnalisisEstrategico"
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"

"%PYTHON_EXE%" %PYTHON_ARGS% -m PyInstaller --noconfirm --clean --onedir --name AnalisisEstrategico --distpath "%OUTPUT_DIR%" --workpath "%BUILD_DIR%" --specpath "%BUILD_DIR%" --add-data "%PROJECT_DIR%frontend\dist;frontend\dist" %PYINSTALLER_BINARY_ARGS% "%PROJECT_DIR%server.py"
if errorlevel 1 (
    echo ERROR: No se pudo construir la aplicacion portable.
    pause
    exit /b 1
)

if exist "%PROJECT_DIR%runtime\browser" (
    xcopy "%PROJECT_DIR%runtime\browser" "%OUTPUT_DIR%\AnalisisEstrategico\runtime\browser\" /E /I /Y >nul
)
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
xcopy "%PROJECT_DIR%iniciar_portable.bat" "%OUTPUT_DIR%\" /I /Y >nul
if errorlevel 1 (
    echo ERROR: No se pudo copiar iniciar_portable.bat a la distribucion.
    pause
    exit /b 1
)
if not exist "%OUTPUT_DIR%iniciar_portable.bat" (
    echo ERROR: El launcher offline no quedo en la distribucion.
    pause
    exit /b 1
)

echo.
echo Distribucion offline creada en:
echo %OUTPUT_DIR%
echo.
echo Puede copiar toda la carpeta offline a otro equipo Windows.
echo Chrome o Edge debe estar instalado, salvo que se incluya runtime\browser.
pause
exit /b 0
