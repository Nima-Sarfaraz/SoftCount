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
echo    Soft Agar Colony Counter - Starting...
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

echo.
echo [OK] Starting server at http://localhost:8000
echo Press Ctrl+C to stop
echo.

REM Open browser after a short delay
start "" timeout /t 2 /nobreak >nul & start http://localhost:8000

REM Start the server
uvicorn api.main:app --host 127.0.0.1 --port 8000

