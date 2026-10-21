@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0." 2>nul || pushd "%~dp0." 2>nul

title PentaFlow - Automated Setup Engine

echo ============================================================================
echo   PentaFlow - Enterprise Structured Data Flow ^& DQ DAMA Studio
echo   Automated Local Setup ^& Provisioning Engine
echo ============================================================================
echo.

REM --------------------------------------------------------------------------
REM 1. Resolve Node.js (System Node.js preferred, Portable LTS v22.x fallback)
REM    Note: Flat goto-flow avoids expanding %%PATH%% or %%CD%% inside ( ... )
REM    blocks, preventing crashes on paths containing parentheses like (x86).
REM --------------------------------------------------------------------------
set "NODE_EXE="
set "NPM_CMD="

where node >nul 2>nul
if errorlevel 1 goto :check_portable_node

for /f "delims=" %%I in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
for /f "delims=" %%I in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%I"
if defined NODE_EXE (
    echo [OK] Found system Node.js: "%NODE_EXE%"
    goto :node_ready
)

:check_portable_node
if not exist "bin\node\node.exe" goto :download_portable_node
set "PATH=%~dp0bin\node;%PATH%"
set "NODE_EXE=%~dp0bin\node\node.exe"
set "NPM_CMD=%~dp0bin\node\npm.cmd"
echo [OK] Found existing portable Node.js: "%NODE_EXE%"
goto :node_ready

:download_portable_node
echo [INFO] System Node.js not found. Downloading portable Node.js LTS v22.x x64...
if not exist "bin" mkdir "bin"
if not exist "bin\node" mkdir "bin\node"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop'; " ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "$baseUrl = 'https://nodejs.org/dist/latest-v22.x/'; " ^
  "$html = (Invoke-WebRequest -Uri $baseUrl -UseBasicParsing).Content; " ^
  "if ($html -match '(node-v22\.[0-9]+\.[0-9]+-win-x64\.zip)') { $zipName = $Matches[1] } else { throw 'Could not resolve Node.js v22 win-x64.zip filename.' }; " ^
  "$zipUrl = $baseUrl + $zipName; " ^
  "$zipPath = Join-Path (Get-Location) 'bin\node-lts.zip'; " ^
  "$extractDir = Join-Path (Get-Location) 'bin\node_extract'; " ^
  "$targetDir = Join-Path (Get-Location) 'bin\node'; " ^
  "Write-Host ('[DOWNLOAD] ' + $zipUrl); " ^
  "Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing; " ^
  "if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }; " ^
  "Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force; " ^
  "$inner = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1; " ^
  "if (-not $inner) { throw 'Portable Node archive structure invalid.' }; " ^
  "Get-ChildItem -Path $inner.FullName -Force | Move-Item -Destination $targetDir -Force; " ^
  "Remove-Item $extractDir -Recurse -Force; " ^
  "Remove-Item $zipPath -Force;"

if errorlevel 1 goto :fail_node
if not exist "bin\node\node.exe" goto :fail_node

set "PATH=%~dp0bin\node;%PATH%"
set "NODE_EXE=%~dp0bin\node\node.exe"
set "NPM_CMD=%~dp0bin\node\npm.cmd"
echo [OK] Portable Node.js installed into "bin\node\node.exe"

:node_ready
if not defined NPM_CMD set "NPM_CMD=npm.cmd"
for /f "delims=" %%V in ('"%NODE_EXE%" -v 2^>nul') do echo [INFO] Active Node.js runtime version: %%V
echo.

REM --------------------------------------------------------------------------
REM 2. Create Storage Directories & Environment Configuration
REM --------------------------------------------------------------------------
echo [STEP 1/3] Preparing workspace directories ^& environment configuration...

if not exist "data" mkdir "data"
if not exist "logs" mkdir "logs"
if not exist "uploads" mkdir "uploads"

if exist ".env" (
    echo [OK] Existing .env configuration preserved
    goto :env_done
)

if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo [OK] Created .env from .env.example ^(BYOK template^)
    goto :env_done
)

>".env" echo # APIsecurity.md - BYOK Configuration ^(Never hardcode developer keys^)
>>".env" echo GEMINI_API_KEY=
>>".env" echo GEMINI_MODEL="gemini-3.8-flash"
>>".env" echo APP_URL="http://localhost:3000"
echo [OK] Created default BYOK .env configuration file

:env_done
echo.
echo [SECURITY - APIsecurity.md] BYOK ^& Offline Fallback Notice:
echo        - Developer keys are NEVER hardcoded in source or scripts.
echo        - Bring Your Own Key ^(BYOK^): Set your own GEMINI_API_KEY= in ".env"
echo          to enable server-side Gemini AI context ingestion.
echo        - Air-Gapped Offline Mode: If GEMINI_API_KEY is left blank, PentaFlow
echo          automatically runs its deterministic Rule Engine ^(0ms latency^).
echo.

REM --------------------------------------------------------------------------
REM 3. Install NPM Dependencies (with --legacy-peer-deps fallback)
REM --------------------------------------------------------------------------
echo [STEP 2/4] Installing npm dependencies...
call "%NPM_CMD%" install --no-audit --fund=false
if not errorlevel 1 goto :npm_ok

echo [WARN] Standard npm install returned a non-zero code. Retrying once with --legacy-peer-deps...
call "%NPM_CMD%" install --no-audit --fund=false --legacy-peer-deps
if errorlevel 1 goto :fail_npm

:npm_ok
if not exist "node_modules" goto :fail_npm
if not exist "node_modules\vite\bin\vite.js" goto :fail_npm
echo [OK] Dependencies verified in node_modules\
echo.

REM --------------------------------------------------------------------------
REM 4. Provision Idempotent Local Catalog Store (scripts/init-db.js)
REM --------------------------------------------------------------------------
echo [STEP 3/4] Provisioning local catalog store ^(data\pentaflow_catalog.json^)...
if not exist "scripts\init-db.js" goto :fail_db

"%NODE_EXE%" "scripts\init-db.js"
if errorlevel 1 goto :fail_db
echo.

REM --------------------------------------------------------------------------
REM 5. Enforce APIsecurity.md Zero-Hardcoding & BYOK Verification Gate
REM --------------------------------------------------------------------------
echo [STEP 4/4] Running APIsecurity.md verification ^(scripts\verify-api-security.js^)...
if not exist "scripts\verify-api-security.js" goto :fail_security

"%NODE_EXE%" "scripts\verify-api-security.js"
if errorlevel 1 goto :fail_security

echo.
echo ============================================================================
echo   SETUP COMPLETE
echo   - Catalog Store : "%~dp0data\pentaflow_catalog.json"
echo   - API Security  : Verified ^(APIsecurity.md BYOK Standard^)
echo   - Launch Command: Run start.bat to launch PentaFlow on http://localhost:3000
echo ============================================================================
echo.
if /i not "%~1"=="--no-pause" pause
exit /b 0

:fail_node
echo.
echo [ERROR] Could not locate or download a valid Node.js runtime.
echo         Verify internet access or install Node.js LTS v22+ manually.
goto :fail

:fail_npm
echo.
echo [ERROR] npm dependency installation failed after retry.
echo         Check your network connection and package.json configuration.
goto :fail

:fail_db
echo.
echo [ERROR] Local catalog provisioning ^(scripts\init-db.js^) failed.
goto :fail

:fail_security
echo.
echo [ERROR] APIsecurity.md verification ^(scripts\verify-api-security.js^) failed.
goto :fail

:fail
echo.
echo ============================================================================
echo   SETUP FAILED - Please review the error messages above.
echo ============================================================================
pause
exit /b 1
