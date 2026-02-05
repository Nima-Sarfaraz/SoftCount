"""FastAPI backend for the Soft Agar Colony Counter."""

from __future__ import annotations

import base64
import csv
import io
import json
import os
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import cv2

from softagar import io as io_utils
from softagar.engine import detect_colonies

from . import models
from .storage import default_storage as storage
from PIL import Image
import numpy as np

app = FastAPI(
    title="SoftCount API",
    version="1.0.1",
    description="Expose colony detection over HTTP for web clients or automation.",
)

# Allow local web front-ends (e.g., Vite dev server) to talk to the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api")
def read_api_info() -> dict:
    """Simple service metadata."""
    return {"service": app.title, "version": app.version}


@app.post("/upload", response_model=models.UploadResponse)
async def upload_images(
    files: List[UploadFile] = File(..., description="One or more image files"),
    session_id: str | None = Query(default=None, description="Optional session token"),
) -> models.UploadResponse:
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    sid = storage.ensure_session(session_id)
    new_count = 0

    for upload in files:
        data = await upload.read()
        if not data:
            continue
        storage.store_image(sid, upload.filename or "upload", data)
        new_count += 1

    if new_count == 0:
        raise HTTPException(status_code=400, detail="No non-empty files were uploaded.")

    # Return all images in the session (not just newly uploaded ones)
    # so frontend state stays in sync with backend
    all_records = storage.get_session_records(sid)
    all_images = [
        models.UploadImageInfo(image_id=r.image_id, filename=r.filename)
        for r in all_records
    ]

    return models.UploadResponse(session_id=sid, images=all_images)


@app.get("/image/{image_id}")
def fetch_image(image_id: str) -> FileResponse:
    try:
        record = storage.get_image(image_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Image not found.")

    media_type = storage.guess_media_type(record.filename) or "application/octet-stream"
    return FileResponse(record.path, media_type=media_type, filename=record.filename)


@app.get("/image/{image_id}/preview")
def fetch_image_preview(image_id: str) -> StreamingResponse:
    """Return a browser-friendly PNG preview for images (e.g., TIFFs)."""
    try:
        record = storage.get_image(image_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Image not found.")

    try:
        with Image.open(record.path) as im:
            # Convert palette/LA to RGB for consistent rendering
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            buf = io.BytesIO()
            im.save(buf, format="PNG")
            buf.seek(0)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Preview generation failed: {exc}") from exc

    headers = {"Cache-Control": "no-store"}
    return StreamingResponse(buf, media_type="image/png", headers=headers)


@app.post("/process/{image_id}", response_model=models.ProcessResponse)
def process_image(image_id: str, params: models.DetectionParams) -> models.ProcessResponse:
    return process_image_handler(image_id=image_id, params=params, include_mask=False)


@app.post("/process/{image_id}/with-mask", response_model=models.ProcessResponse)
def process_image_with_mask(
    image_id: str,
    params: models.DetectionParams,
    include_mask: bool = Query(default=True, description="If true, include mask_png preview"),
) -> models.ProcessResponse:
    return process_image_handler(image_id=image_id, params=params, include_mask=include_mask)


def process_image_handler(
    image_id: str,
    params: models.DetectionParams,
    include_mask: bool = False,
) -> models.ProcessResponse:
    try:
        record = storage.get_image(image_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Image not found.")

    try:
        img = io_utils.load_image(record.path)
        detection = detect_colonies(img, **params.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Processing failed: {exc}") from exc

    storage.save_detection(
        image_id=image_id,
        colonies=detection.get("colonies", []),
        count=int(detection.get("count", 0)),
        parameters=params.model_dump(),
    )

    colonies = [models.Colony(**colony) for colony in detection.get("colonies", [])]
    mask_png: str | None = None
    if include_mask:
        mask = detection.get("mask")
        if mask is not None:
            try:
                # Ensure contiguous memory layout for cv2.imencode (fixes Docker issues)
                mask = np.ascontiguousarray(mask)
                success, encoded = cv2.imencode(".png", mask)
                if success:
                    mask_png = base64.b64encode(encoded.tobytes()).decode("utf-8")
            except Exception:
                mask_png = None
    return models.ProcessResponse(
        image_id=image_id,
        session_id=record.session_id,
        count=int(detection.get("count", 0)),
        colonies=colonies,
        parameters=params,
        mask_png=mask_png,
    )


@app.post("/annotations/{image_id}", response_model=models.AnnotationResponse)
def update_annotations(image_id: str, payload: models.AnnotationRequest) -> models.AnnotationResponse:
    try:
        record = storage.update_annotations(
            image_id=image_id,
            manual_added=[col.model_dump() for col in payload.manual_added],
            manual_removed=[col.model_dump() for col in payload.manual_removed],
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Image not found.")

    final_count = storage.final_count(record)
    return models.AnnotationResponse(
        image_id=image_id,
        session_id=record.session_id,
        auto_count=int(record.last_detection_count),
        manual_added=len(record.manual_added),
        manual_removed=len(record.manual_removed),
        final_count=final_count,
    )


@app.get("/results/{session_id}")
def download_results(session_id: str) -> StreamingResponse:
    records = storage.get_session_records(session_id)
    if not records:
        raise HTTPException(status_code=404, detail="Session not found or has no images.")

    rows = []
    for record in records:
        # Format parameters as JSON string for CSV export
        params_str = ""
        if record.last_parameters:
            params_str = json.dumps(record.last_parameters, separators=(",", ":"))
        
        rows.append(
            {
                "filename": record.filename,
                "count": storage.final_count(record),
                "auto_count": int(record.last_detection_count),
                "manual_added": len(record.manual_added),
                "manual_removed": len(record.manual_removed),
                "image_id": record.image_id,
                "parameters": params_str,
            }
        )

    csv_buffer = io.StringIO()
    writer = csv.DictWriter(
        csv_buffer,
        fieldnames=["filename", "count", "auto_count", "manual_added", "manual_removed", "image_id", "parameters"],
    )
    writer.writeheader()
    writer.writerows(rows)

    csv_buffer.seek(0)
    headers = {"Content-Disposition": f'attachment; filename="results_{session_id}.csv"'}
    return StreamingResponse(iter([csv_buffer.getvalue()]), media_type="text/csv", headers=headers)


# ---------------------------------------------------------------------------
# Static file serving for the React frontend (when built)
# ---------------------------------------------------------------------------

# Determine frontend dist path - check multiple locations
_api_dir = Path(__file__).resolve().parent
_project_root = _api_dir.parent

# Try these locations in order:
# 1. /app/frontend/dist (Docker)
# 2. ./frontend/dist (development, relative to project root)
_frontend_candidates = [
    Path("/app/frontend/dist"),
    _project_root / "frontend" / "dist",
]

_frontend_dist: Path | None = None
for candidate in _frontend_candidates:
    if candidate.is_dir() and (candidate / "index.html").exists():
        _frontend_dist = candidate
        break


if _frontend_dist is not None:
    # Mount static assets (JS, CSS, images)
    _assets_dir = _frontend_dist / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="static-assets")

    # Serve other static files (favicon, etc.)
    @app.get("/vite.svg")
    def serve_vite_svg() -> FileResponse:
        return FileResponse(_frontend_dist / "vite.svg")

    # Serve index.html at root
    @app.get("/")
    def serve_root() -> HTMLResponse:
        """Serve the React SPA at root."""
        index_file = _frontend_dist / "index.html"
        if index_file.exists():
            return HTMLResponse(content=index_file.read_text(), status_code=200)
        raise HTTPException(status_code=404, detail="Frontend not built")

    # Catch-all route for SPA - must be last
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str) -> HTMLResponse:
        """Serve the React SPA for any unmatched routes."""
        # Don't serve index.html for API-like paths that weren't matched
        if full_path.startswith(("upload", "image/", "process/", "annotations/", "results/", "api")):
            raise HTTPException(status_code=404, detail="Not found")

        index_file = _frontend_dist / "index.html"
        if index_file.exists():
            return HTMLResponse(content=index_file.read_text(), status_code=200)
        raise HTTPException(status_code=404, detail="Frontend not built")

