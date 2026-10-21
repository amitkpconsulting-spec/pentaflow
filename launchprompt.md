# Local Browser Launcher Best-Practice Review & Reusable Master Prompt (`launchprompt.md`)

## Part 1: Best-Practice Audit & Review of `setup.bat` and `start.bat`

A line-by-line review of **`setup.bat`**, **`start.bat`**, and **`scripts/init-db.js`** was conducted against Windows Batch (`cmd.exe`) engineering best practices. Below is the verification matrix and the hardening refinements applied:

### 1. Project Truth Alignment
- **Zero Hallucinated Dependencies**: Verified against `package.json`, `vite.config.ts`, `.env.example`, and `src/services/localLlmService.ts`. PentaFlow is a React 19 + Vite 6 + `@xyflow/react` SPA with a built-in deterministic Rule Engine (`0ms` air-gapped latency) and optional local LLM connectivity. Neither script attempts to install or block on non-existent sidecars.
- **Idempotent Storage & Catalog Provisioning (`scripts/init-db.js`)**: Creates `data/`, `logs/`, and `uploads/` and provisions `data\pentaflow_catalog.json` idempotently without overwriting existing user data.
- **Entry Point Resolution**: Checks for a compiled production server (`dist\server.cjs`) first and falls back to `"%NODE_EXE%" "node_modules\vite\bin\vite.js" --port=3000 --host=0.0.0.0`.

### 2. Path & Special-Character Hardening (`&`, Spaces, Parentheses `()`)
- **Directory Anchoring**: Both scripts begin with:
  ```bat
  @echo off
  setlocal EnableExtensions DisableDelayedExpansion
  cd /d "%~dp0." 2>nul || pushd "%~dp0." 2>nul
  ```
- **Elimination of `%PATH%` / `%CD%` Expansion Inside Parenthesized `( ... )` Blocks**:
  - *Finding*: In Windows `cmd.exe`, expanding `%PATH%` (which almost always contains `C:\Program Files (x86)\...`) or `%CD%` (if the repo is cloned inside a folder with parentheses like `C:\Projects (2026)\pentaflow`) inside a parenthesized `if (...)` block causes `cmd.exe` to prematurely close the `(` block on the `)` in `(x86)` and crash.
  - *Hardening Applied*: Replaced nested `( ... )` blocks that modified `PATH` with flat `:label` jumps (`goto :check_portable_node`, `goto :verify_modules`, `goto :verify_db`, `goto :launch_server`) and used `%~dp0` instead of `%CD%`.
- **Escaped Metacharacters**: Every `echo` containing `&`, `(`, `)`, `|`, `<`, or `>` uses `^&`, `^(`, `^)` or quoted strings.

### 3. Runtime & Dependency Auto-Healing
- **Consistent Node.js Resolution Order**: Both `setup.bat` and `start.bat` now check system `node.exe` (`where node`) first and fall back to portable Node.js LTS v22.x (`bin\node\node.exe`), automatically downloading and extracting the official `win-x64.zip` via PowerShell over TLS 1.2 if absent.
- **Deep Dependency Verification**: Instead of only checking `if not exist "node_modules"` (which can pass on an empty or partially failed directory), both scripts now verify `if not exist "node_modules\vite\bin\vite.js"` to guarantee the Vite CLI binary is actually installed before launching.
- **Non-Blocking Browser Launch & Persistent Terminal**:
  - `start.bat` launches the default browser asynchronously after a 4-second boot delay:
    ```bat
    start "" /min cmd /c "timeout /t 4 /nobreak >nul & start "" http://localhost:3000"
    ```
  - All exit and error paths (`:err_no_node`, `:err_setup`, `:err_db`, `:err_server`) terminate with `cmd /k` so the terminal window never vanishes on error.

---

## Part 2: Reusable Master Prompt for Guaranteed Local Browser Launchers

Copy and paste the prompt below into any AI coding session or project workspace whenever you need to generate **`setup.bat`** and **`start.bat`** that guarantee a working one-click local server and browser launch on Windows:

```markdown
Create two Windows batch launchers — `setup.bat` and `start.bat` — for this project that guarantee a successful local server and browser launch on a fresh Windows machine. Follow these engineering rules strictly:

### PHASE 1: DISCOVER PROJECT TRUTH (Verify before writing any file)
1. Inspect `package.json`, the server entry file (e.g., `server.ts`, `server.js`, or `vite.config.ts`), and `.env.example` FIRST.
   - Derive every step from what the repository actually uses.
   - Do NOT invent external sidecars, Ollama daemons, or model downloads unless they are genuinely required by the codebase.
2. Identify the real local database or storage path from the code (e.g., SQLite file path, JSON catalog path, or local storage directories) and its exact schema.
   - Ensure an idempotent provisioning script (e.g., `scripts/init-db.js`) exists and creates required directories (`data/`, `logs/`, `uploads/`) and database tables/files without overwriting existing data.
3. Identify the real startup command chain and port (e.g., `http://localhost:3000`):
   - Prefer a compiled production artifact (`dist\server.cjs` or `dist\index.js`) if present; otherwise invoke the local CLI binary directly with `"%NODE_EXE%"` (e.g., `"%NODE_EXE%" "node_modules\vite\bin\vite.js" --port=3000 --host=0.0.0.0` or `"%NODE_EXE%" "node_modules\tsx\dist\cli.mjs" server.ts`).

### PHASE 2: `setup.bat` — Automated Setup & Provisioning Engine
1. **Header & Directory Anchoring**:
   ```bat
   @echo off
   setlocal EnableExtensions DisableDelayedExpansion
   cd /d "%~dp0." 2>nul || pushd "%~dp0." 2>nul
   ```
   Never rely on the caller's working directory.
2. **Parentheses-Safe Control Flow**:
   - NEVER expand `%PATH%` or `%CD%` inside a parenthesized `if (...) else (...)` block (`C:\Program Files (x86)` will break `cmd.exe` block parsing). Use flat `if ... goto :label` jumps and `%~dp0` paths.
3. **Node.js Resolution & Portable LTS Auto-Download**:
   - Prefer system Node.js (`where node`).
   - If absent, check `bin\node\node.exe`.
   - If still absent, use PowerShell (`[Net.SecurityProtocolType]::Tls12`) to resolve and download the latest `node-v22.*-win-x64.zip` from `https://nodejs.org/dist/latest-v22.x/`, extract it via `Expand-Archive`, move the inner folder contents into `bin\node\`, and prepend `%~dp0bin\node` to `PATH`.
4. **Workspace & Environment Initialization**:
   - Create `data\`, `logs\`, and `uploads\` if missing.
   - Copy `.env.example` to `.env` if `.env` does not exist (never overwrite an existing `.env`).
   - Print a clear hint explaining optional API keys (e.g., `GEMINI_API_KEY`) and the application's offline/fallback behavior.
5. **Resilient Dependency Installation**:
   - Run `call "%NPM_CMD%" install --no-audit --fund=false`.
   - If `errorlevel 1`, retry once with `call "%NPM_CMD%" install --no-audit --fund=false --legacy-peer-deps`.
   - Verify the actual CLI entrypoint binary exists inside `node_modules\` (not just the `node_modules` folder). Jump to `:fail_npm` on error.
6. **Database / Storage Provisioning**:
   - Run `"%NODE_EXE%" "scripts\init-db.js"` and verify exit code `0`.
   - Support an optional `--no-pause` flag (`if /i not "%~1"=="--no-pause" pause`) so `start.bat` can invoke `setup.bat` headlessly during auto-healing.

### PHASE 3: `start.bat` — One-Click Startup & Browser Orchestrator
1. **Same Header & Flat Goto-Flow**:
   - Use the exact same `setlocal EnableExtensions DisableDelayedExpansion` and `cd /d "%~dp0."` anchoring, avoiding `%PATH%` expansion inside `(...)` blocks.
2. **Three-Stage Pre-Flight Auto-Healing**:
   - **Check 1 (Node.js)**: Resolve system `node.exe` or `bin\node\node.exe`. If missing, `call "setup.bat" --no-pause`.
   - **Check 2 (Dependencies)**: Verify the key binary in `node_modules\` (e.g., `node_modules\vite\bin\vite.js`). If missing, `call "setup.bat" --no-pause`.
   - **Check 3 (Database/Catalog)**: Verify the database/catalog file exists. If missing, run `"%NODE_EXE%" "scripts\init-db.js"`.
   - Never start the server in an unprovisioned state.
3. **Clear Telemetry Banner**:
   - Before starting the server, print the resolved Node executable, the local application URL (`http://localhost:3000`), the database/catalog file path, and `"Keep this terminal open / Press Ctrl+C to stop"`.
4. **Non-Blocking Delayed Browser Launch**:
   - Trigger the default browser in a minimized background subshell that waits 4 seconds for server boot:
     ```bat
     start "" /min cmd /c "timeout /t 4 /nobreak >nul & start "" http://localhost:3000"
     ```
5. **Unconditional Open Terminal (`cmd /k`)**:
   - Launch the server (`dist\server.cjs` if built, otherwise the dev server CLI).
   - End the normal exit path and every error label (`:err_no_node`, `:err_setup`, `:err_db`, `:err_server`) with `cmd /k` so the window never closes automatically on failure.

### PHASE 4: CROSS-CUTTING SYNTAX, API SECURITY (`APIsecurity.md`) & VERIFICATION RULES
- **Mandatory API Key Security (`APIsecurity.md`)**:
  - NEVER hardcode a developer's `GEMINI_API_KEY` or any secret in source code, `vite.config.ts`, `.env.example`, `setup.bat`, or `start.bat`.
  - Enforce **Bring Your Own Key (BYOK)**: `.env.example` and `setup.bat` must initialize `GEMINI_API_KEY=` as an empty user-configurable field so each user/deployer populates their own key in `.env` (or platform Secrets), safeguarding the developer's key from exposure.
  - Run `node scripts/verify-api-security.js` during `setup.bat`, `start.bat`, and `npm run build` (`prebuild`) to block hardcoded `AIza...` keys and client-side bundle leaks.
- Escape every `&`, `|`, `(`, `)`, `<`, `>` in `echo` lines using `^` (e.g., `^&`, `^(`, `^)`).
- Test the provisioning script and confirm the server responds with `HTTP 200` on `http://localhost:3000`.
```
