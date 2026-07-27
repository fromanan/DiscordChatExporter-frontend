pushd "%~dp0"

@REM kill running dcef processes
taskkill /f /im dcefmongod.exe
taskkill /f /im dcefnginx.exe

@REM Find a real Python interpreter. DCEF_PYTHON can override discovery.
set "PYTHON_EXE="
if defined DCEF_PYTHON if exist "%DCEF_PYTHON%" set "PYTHON_EXE=%DCEF_PYTHON%"

if not defined PYTHON_EXE (
    for /f "delims=" %%P in ('where py 2^>nul') do if not defined PYTHON_EXE set "PYTHON_EXE=%%P"
)

if not defined PYTHON_EXE (
    for /f "delims=" %%P in ('where python 2^>nul') do if not defined PYTHON_EXE set "PYTHON_EXE=%%P"
)

if defined PYTHON_EXE (
    "%PYTHON_EXE%" -c "import sys; assert sys.version_info >= (3, 11)" >nul 2>&1
    if errorlevel 1 set "PYTHON_EXE="
)

@REM Optional fallback for Codex desktop's bundled Python.
if not defined PYTHON_EXE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" set "PYTHON_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if not defined PYTHON_EXE (
    echo ERROR: Python 3.11 or newer was not found.
    echo Install Python or set DCEF_PYTHON to the full path of python.exe.
    popd
    exit /b 1
)

echo Using Python: %PYTHON_EXE%

@REM run python in venv windows
if not exist "_temp\fastapi\venv\Scripts\python.exe" (
    "%PYTHON_EXE%" -m venv _temp/fastapi/venv
    if errorlevel 1 goto setup_failed
    "_temp\fastapi\venv\Scripts\python.exe" -m pip install -r dcef/backend/fastapi/requirements.txt
    if errorlevel 1 goto setup_failed
)

if not exist "_temp\preprocess\venv\Scripts\python.exe" (
    "%PYTHON_EXE%" -m venv _temp/preprocess/venv
    if errorlevel 1 goto setup_failed
    "_temp\preprocess\venv\Scripts\python.exe" -m pip install -r dcef/backend/preprocess/requirements.txt
    if errorlevel 1 goto setup_failed
)

@REM install frontend dependencies
cd dcef\frontend
if not exist "node_modules" (
    call npm install
)
cd ..\..


@REM create required folders
if not exist logs mkdir logs
if not exist temp mkdir temp
for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ResolveMongoPath.ps1"`) do set "DCEF_MONGODB_PATH=%%P"
if not defined DCEF_MONGODB_PATH (
    echo ERROR: Could not resolve a MongoDB data path.
    popd
    exit /b 1
)
echo Using MongoDB data: %DCEF_MONGODB_PATH%
if not exist "%DCEF_MONGODB_PATH%\" mkdir "%DCEF_MONGODB_PATH%"

@REM start the scripts
set DCEF_PREPROCESS_WATCH=1
start wt --maximized -d %~dp0\dcef\backend\fastapi cmd /k "..\..\..\_temp\fastapi\venv\Scripts\python.exe" dev.py; ^
split-pane -V -d %~dp0\dcef\backend\preprocess cmd /k nodemon -e py --ignore "__pycache__"  --exec "..\..\..\_temp\preprocess\venv\Scripts\python.exe" main_mongo.py windows; ^
move-focus left; ^
split-pane -H -d %~dp0\dcef\frontend cmd /k npm run dev; ^
move-focus right; ^
split-pane -H -d %~dp0 cmd /k "dcef\backend\nginx\dcefnginx.exe" -c "dcef\backend\nginx\conf\nginx-dev.conf"; ^
move-focus right; ^
split-pane -H  -d %~dp0\dcef\backend\mongodb cmd /k "dcefmongod.exe" --dbpath "%DCEF_MONGODB_PATH%"

timeout /t 5 /nobreak >nul

start "browser" rundll32 url.dll,FileProtocolHandler http://127.0.0.1:21012/
popd
exit /b 0

:setup_failed
echo ERROR: DCEF development environment setup failed. No service panes were started.
popd
exit /b 1
