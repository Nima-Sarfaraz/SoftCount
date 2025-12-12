# Multi-stage Dockerfile for Soft Agar Colony Counter
# Builds React frontend and serves it from FastAPI backend

# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./

# Build with empty API URL so it uses relative paths (same origin)
ENV VITE_API_BASE_URL=""
RUN npm run build

# Stage 2: Python runtime with backend + built frontend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python package files
COPY pyproject.toml README.md LICENSE ./
COPY softagar/ ./softagar/
COPY api/ ./api/

# Install Python dependencies
RUN pip install --no-cache-dir -e ".[api]"

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data directory for uploads
RUN mkdir -p /app/data

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATA_DIR=/app/data
ENV DOCKER_ENV=1

EXPOSE 8000

# Run with single worker to ensure in-memory storage consistency
# (each worker has isolated memory, so multi-worker breaks session state)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

