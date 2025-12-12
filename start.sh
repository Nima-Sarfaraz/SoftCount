#!/usr/bin/env bash
# Soft Agar Colony Counter - Local Launcher (macOS/Linux)
# Usage: ./start.sh
#
# This script:
# 1. Creates a Python virtual environment if needed
# 2. Installs Python dependencies
# 3. Builds the React frontend (if Node.js is available)
# 4. Starts the FastAPI server
# 5. Opens the browser

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔════════════════════════════════════════════╗"
echo "║   Soft Agar Colony Counter - Starting...   ║"
echo "╚════════════════════════════════════════════╝"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python version
check_python() {
    if command -v python3 &> /dev/null; then
        PYTHON=python3
    elif command -v python &> /dev/null; then
        PYTHON=python
    else
        echo -e "${RED}Error: Python 3.10+ is required but not found.${NC}"
        echo "Please install Python from https://www.python.org/downloads/"
        exit 1
    fi
    
    # Check version
    VERSION=$($PYTHON -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    MAJOR=$($PYTHON -c 'import sys; print(sys.version_info.major)')
    MINOR=$($PYTHON -c 'import sys; print(sys.version_info.minor)')
    
    if [ "$MAJOR" -lt 3 ] || ([ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 10 ]); then
        echo -e "${RED}Error: Python 3.10+ required, found $VERSION${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Found Python $VERSION${NC}"
}

# Setup virtual environment
setup_venv() {
    if [ ! -d ".venv" ]; then
        echo -e "${YELLOW}Creating virtual environment...${NC}"
        $PYTHON -m venv .venv
    fi
    
    # Activate venv
    source .venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
}

# Install Python dependencies
install_python_deps() {
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install --quiet --upgrade pip
    pip install --quiet -e ".[api]"
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
}

# Build frontend if Node.js is available
build_frontend() {
    if command -v npm &> /dev/null; then
        if [ ! -d "frontend/dist" ] || [ "frontend/src" -nt "frontend/dist" ]; then
            echo -e "${YELLOW}Building React frontend...${NC}"
            echo -e "${YELLOW}  (Using npm ci for deterministic, secure install)${NC}"
            cd frontend
            npm ci --silent
            VITE_API_BASE_URL="" npm run build
            cd ..
            echo -e "${GREEN}✓ Frontend built${NC}"
        else
            echo -e "${GREEN}✓ Frontend already built${NC}"
        fi
    else
        if [ -d "frontend/dist" ]; then
            echo -e "${GREEN}✓ Using pre-built frontend (recommended for security)${NC}"
        else
            echo -e "${RED}Warning: Pre-built frontend is missing.${NC}"
            echo "Install Node.js from https://nodejs.org/ and run: cd frontend && npm ci && npm run build"
        fi
    fi
}

# Open browser (cross-platform)
open_browser() {
    URL="http://localhost:8000"
    sleep 2  # Wait for server to start
    
    if command -v xdg-open &> /dev/null; then
        xdg-open "$URL" &> /dev/null &
    elif command -v open &> /dev/null; then
        open "$URL" &
    else
        echo -e "${YELLOW}Open your browser to: $URL${NC}"
    fi
}

# Main
check_python
setup_venv
install_python_deps
build_frontend

echo
echo -e "${GREEN}Starting server at http://localhost:8000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo

# Open browser in background
open_browser &

# Start the server
exec uvicorn api.main:app --host 127.0.0.1 --port 8000

