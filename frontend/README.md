# Web UI – React + Vite

Browser front-end for the FastAPI backend. Upload plates, run detection, annotate via canvas, and export CSV.

## Quickstart

### 1) Start the API (from repo root)
```bash
pip install -e ".[api]"
uvicorn api.main:app --reload --port 8000
```

### 2) Start the web UI
```bash
cd frontend
npm install
npm run dev -- --host
```

- Default API target: `http://localhost:8000`
- Override with an env file: create `frontend/.env.local` containing:
  ```
  VITE_API_BASE_URL=http://localhost:8000
  ```

## Features
- File uploads (keeps/reuses `session_id` across batches)
- Parameter sliders mapped to engine inputs
- Konva canvas overlays:
  - Auto colonies (blue)
  - Manual adds (green)
  - Removed auto colonies (red)
- Mode toggle: View / Add / Remove
- CSV download for the active session

## Workflow
1. Upload one or more images → a session id is issued.
2. Select an image, tune parameters, click **Run detection**.
3. Switch to **Add** to place new colonies; **Remove** to strike false positives.
4. Download a CSV covering all images in the session.

## Notes
- CORS is enabled on the API for Vite dev ports (`5173`, `4173`).
- The canvas fetches images directly from `/image/{image_id}` using the same API base URL.
