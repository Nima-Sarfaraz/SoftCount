@echo off
REM Soft Agar Colony Counter - Local Launcher (Windows)
REM Usage: start.bat
REM
REM This script:
REM 1. Creates a Python virtual environment if needed
REM 2. Installs Python dependencies
REM 3. Builds the React frontend (if Node.js is available)
REM 4. Starts the FastAPI server
REM 5. Opens the browser

setlocal EnableDelayedExpansion

echo ============================================
echo         SoftCount - Starting...
echo ============================================
echo.

cd /d "%~dp0"

REM Check for Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=*" %%i in ('python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"') do set PYVER=%%i
echo [OK] Found Python %PYVER%

REM Create virtual environment if needed
if not exist ".venv" (
    echo [INFO] Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
call .venv\Scripts\activate.bat
echo [OK] Virtual environment activated

REM Install Python dependencies
echo [INFO] Installing Python dependencies...
pip install --quiet --upgrade pip
pip install --quiet -e ".[api]"
echo [OK] Python dependencies installed

REM Build frontend if Node.js is available
where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    if not exist "frontend\dist" (
        echo [INFO] Building React frontend...
        echo [INFO] Using npm ci for deterministic, secure install
        cd frontend
        call npm ci --silent
        set VITE_API_BASE_URL=
        call npm run build
        cd ..
        echo [OK] Frontend built
    ) else (
        echo [OK] Frontend already built
    )
) else (
    if exist "frontend\dist" (
        echo [OK] Using pre-built frontend (recommended for security)
    ) else (
        echo [WARNING] Node.js not found and no pre-built frontend.
        echo Install Node.js from https://nodejs.org/ to build the frontend.
    )
)

REM Find an available port starting from 8000
echo [INFO] Finding available port...
for /f "tokens=*" %%p in ('powershell -Command "$port = 8000; while ($port -lt 8100) { $listener = $null; try { $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port); $listener.Start(); $listener.Stop(); Write-Output $port; exit 0 } catch { $port++ } finally { if ($listener) { $listener.Stop() } } }; Write-Output 8000"') do set PORT=%%p

if not "%PORT%"=="8000" (
    echo [NOTE] Port 8000 is in use, using port %PORT% instead
)

echo.
echo [OK] Starting server at http://localhost:%PORT%
echo Press Ctrl+C to stop
echo.

REM Start server in background, wait for it to be ready, then open browser
start /b uvicorn api.main:app --host 127.0.0.1 --port %PORT%

REM Wait for server to respond (poll every 0.5s, up to 30s)
echo [INFO] Waiting for server to be ready...
powershell -Command "$port = '%PORT%'; $timeout = 60; for ($i = 0; $i -lt $timeout; $i++) { try { $null = Invoke-WebRequest -Uri \"http://localhost:$port\" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop; Start-Process \"http://localhost:$port\"; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; Write-Host 'Server taking longer than expected. Open http://localhost:$port manually.'"

REM Keep window open (server runs in background)
echo.
echo [OK] Browser opened. Server is running.
echo Close this window or press Ctrl+C to stop the server.
pause >nul

