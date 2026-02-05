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

# Find an available port starting from a given port
find_available_port() {
    local port=${1:-8000}
    local max_port=$((port + 100))
    
    while [ $port -lt $max_port ]; do
        # Check if port is in use (works on both macOS and Linux)
        if ! (echo >/dev/tcp/127.0.0.1/$port) 2>/dev/null; then
            echo $port
            return 0
        fi
        port=$((port + 1))
    done
    
    # Fallback: return original port and let uvicorn fail with clear error
    echo ${1:-8000}
    return 1
}

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

# Wait for server to be ready, then open browser
# Usage: wait_and_open_browser <port>
wait_and_open_browser() {
    local port=${1:-8000}
    local URL="http://localhost:$port"
    
    # Wait up to 30 seconds for server to respond
    for i in {1..60}; do
        if curl -s "$URL" > /dev/null 2>&1; then
            # Server is ready, open browser
            if command -v xdg-open &> /dev/null; then
                xdg-open "$URL" &> /dev/null &
            elif command -v open &> /dev/null; then
                open "$URL" &
            else
                echo -e "${YELLOW}Open your browser to: $URL${NC}"
            fi
            return 0
        fi
        sleep 0.5
    done
    
    echo -e "${YELLOW}Server taking longer than expected. Open your browser to: $URL${NC}"
}

# Main
check_python
setup_venv
install_python_deps
build_frontend

# Find an available port
PORT=$(find_available_port 8000)
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Could not verify port availability, trying port $PORT anyway${NC}"
fi

if [ "$PORT" != "8000" ]; then
    echo -e "${YELLOW}Note: Port 8000 is in use, using port $PORT instead${NC}"
fi

echo
echo -e "${GREEN}Starting server at http://localhost:$PORT${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo

# Start server in background, wait for it, then open browser
uvicorn api.main:app --host 127.0.0.1 --port $PORT &
SERVER_PID=$!

# Wait for server to be ready, then open browser
wait_and_open_browser $PORT

# Bring server to foreground (wait for it, pass through Ctrl+C)
wait $SERVER_PID

