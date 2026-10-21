@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0." 2>nul || pushd "%~dp0." 2>nul

title PentaFlow - One-Click Startup Orchestrator

echo ============================================================================
echo   PentaFlow - Enterprise Structured Data Flow ^& DQ DAMA Studio
echo   One-Click Local Server Orchestrator
echo ============================================================================
echo.

REM --------------------------------------------------------------------------
REM 1. Pre-Flight Validation & Auto-Healing: Node.js Runtime
REM    System Node.js preferred; portable bin\node\node.exe fallback.
REM    Flat goto-flow prevents crashes when %%PATH%% contains (x86) or spaces.
REM --------------------------------------------------------------------------
set "NODE_EXE="
set "NPM_CMD="

where node >nul 2>nul
if errorlevel 1 goto :check_portable_node

for /f "delims=" %%I in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
for /f "delims=" %%I in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%I"
if defined NODE_EXE goto :verify_modules

:check_portable_node
if not exist "bin\node\node.exe" goto :heal_node
set "PATH=%~dp0bin\node;%PATH%"
set "NODE_EXE=%~dp0bin\node\node.exe"
set "NPM_CMD=%~dp0bin\node\npm.cmd"
goto :verify_modules

:heal_node
echo [AUTO-HEAL] Node.js runtime not detected. Running setup.bat...
call "setup.bat" --no-pause
if errorlevel 1 goto :err_setup

where node >nul 2>nul
if not errorlevel 1 (
    for /f "delims=" %%I in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
)
if defined NODE_EXE goto :verify_modules

if not exist "bin\node\node.exe" goto :err_no_node
set "PATH=%~dp0bin\node;%PATH%"
set "NODE_EXE=%~dp0bin\node\node.exe"
set "NPM_CMD=%~dp0bin\node\npm.cmd"

REM --------------------------------------------------------------------------
REM 2. Pre-Flight Validation & Auto-Healing: node_modules\ & Vite CLI
REM --------------------------------------------------------------------------
:verify_modules
if not defined NODE_EXE goto :err_no_node
if exist "node_modules\vite\bin\vite.js" goto :verify_db

echo [AUTO-HEAL] Dependencies ^(node_modules\^) missing or incomplete. Running setup.bat...
call "setup.bat" --no-pause
if errorlevel 1 goto :err_setup
if not exist "node_modules\vite\bin\vite.js" goto :err_setup

REM --------------------------------------------------------------------------
REM 3. Pre-Flight Validation & Auto-Healing: Catalog Database File
REM --------------------------------------------------------------------------
:verify_db
if exist "data\pentaflow_catalog.json" goto :verify_security

echo [AUTO-HEAL] Catalog store ^(data\pentaflow_catalog.json^) missing. Running scripts\init-db.js...
"%NODE_EXE%" "scripts\init-db.js"
if errorlevel 1 goto :err_db
if not exist "data\pentaflow_catalog.json" goto :err_db

REM --------------------------------------------------------------------------
REM 4. Pre-Flight APIsecurity.md Gate (Zero Hardcoded Keys & BYOK Check)
REM --------------------------------------------------------------------------
:verify_security
if not exist "scripts\verify-api-security.js" goto :launch_server
"%NODE_EXE%" "scripts\verify-api-security.js"
if errorlevel 1 goto :err_security

REM --------------------------------------------------------------------------
REM 5. Launch Server & Non-Blocking Delayed Browser Opener
REM --------------------------------------------------------------------------
:launch_server
echo.
echo [READY] Pre-flight verification passed.
echo   - Node Runtime          : "%NODE_EXE%"
echo   - Local Application URL : http://localhost:3000
echo   - Local Catalog Store   : "%~dp0data\pentaflow_catalog.json"
echo   - BYOK Security Policy  : APIsecurity.md ^(Configure GEMINI_API_KEY in .env^)
echo   - Server Control        : Keep this terminal open / Press Ctrl+C to stop
echo.

start "" /min cmd /c "timeout /t 4 /nobreak >nul & start "" http://localhost:3000"

if exist "dist\server.cjs" goto :run_prod
if exist "node_modules\tsx\dist\cli.mjs" goto :run_tsx
echo [START] Launching Vite development server on port 3000...
"%NODE_EXE%" "node_modules\vite\bin\vite.js" --port=3000 --host=0.0.0.0
goto :after_server

:run_tsx
echo [START] Launching full-stack Express + Vite server ^(server.ts^) on port 3000...
"%NODE_EXE%" "node_modules\tsx\dist\cli.mjs" "server.ts"
goto :after_server

:run_prod
echo [START] Launching production bundle ^(dist\server.cjs^)...
"%NODE_EXE%" "dist\server.cjs"

:after_server
if errorlevel 1 goto :err_server

echo.
echo [INFO] Server process exited.
cmd /k
exit /b 0

:err_no_node
echo.
echo [ERROR] Node.js executable could not be resolved even after running setup.bat.
cmd /k
exit /b 1

:err_setup
echo.
echo [ERROR] Pre-flight auto-healing via setup.bat failed. Cannot start server in an unprovisioned state.
cmd /k
exit /b 1

:err_db
echo.
echo [ERROR] Failed to provision local catalog store ^(data\pentaflow_catalog.json^).
cmd /k
exit /b 1

:err_security
echo.
echo [ERROR] APIsecurity.md pre-flight check failed. Remove any hardcoded API keys before starting.
cmd /k
exit /b 1

:err_server
echo.
echo [ERROR] Server process terminated with an error code. Check logs above.
cmd /k
exit /b 1
