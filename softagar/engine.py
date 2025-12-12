"""Core colony detection engine extracted from the Streamlit prototype."""

from __future__ import annotations

import os
from typing import Any, Dict, List

import cv2
import numpy as np

# Limit OpenCV threads in Docker to prevent container threading issues
# Native Python users retain full multi-threaded performance
if os.environ.get("DOCKER_ENV"):
    cv2.setNumThreads(1)


def _ensure_grayscale(img: np.ndarray) -> np.ndarray:
    """Return a grayscale copy of the provided image."""
    if img.ndim == 2:
        return img.copy()

    if img.ndim == 3 and img.shape[2] == 3:
        try:
            return cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        except cv2.error:
            return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    raise ValueError("img must be a 2D (grayscale) or 3D (RGB/BGR) numpy array")


def _make_kernel(size: int) -> np.ndarray:
    """Create a square kernel for morphological operations."""
    size = max(1, int(size))
    return np.ones((size, size), np.uint8)


def detect_colonies(
    img: np.ndarray,
    global_thresh: int = 127,
    adaptive_block_size: int = 21,
    adaptive_C: int = 4,
    morph_kernel_size: int = 3,
    opening_iterations: int = 2,
    dilation_iterations: int = 3,
    closing_iterations: int = 6,
    min_area: int = 525,
    max_area: int = 15000,
    clahe_clip_limit: float = 2.0,
    clahe_tile_grid_size: int = 8,
) -> Dict[str, Any]:
    """
    Detect colonies in a soft agar image.

    Args:
        img: Input image as a NumPy array (RGB, BGR, or grayscale).
        global_thresh: Global threshold value (0-255).
        adaptive_block_size: Block size for adaptive thresholding (odd integer >= 3).
        adaptive_C: Constant subtracted from the mean in adaptive thresholding.
        morph_kernel_size: Size of the square kernel for morphological operations.
        opening_iterations: Number of opening iterations.
        dilation_iterations: Number of dilation iterations applied between opening/closing.
        closing_iterations: Number of closing iterations.
        min_area: Minimum contour area treated as a colony.
        max_area: Maximum contour area treated as a colony.
        clahe_clip_limit: Contrast limit for CLAHE pre-processing.
        clahe_tile_grid_size: Grid size for CLAHE (applied equally in both dimensions).

    Returns:
        Dictionary with colony metadata and intermediate images.
    """

    if max_area <= min_area:
        raise ValueError("max_area must be greater than min_area")

    adaptive_block_size = max(3, int(adaptive_block_size))
    if adaptive_block_size % 2 == 0:
        adaptive_block_size += 1

    gray = _ensure_grayscale(img)
    clahe = cv2.createCLAHE(
        clipLimit=float(clahe_clip_limit),
        tileGridSize=(int(clahe_tile_grid_size), int(clahe_tile_grid_size)),
    )
    preprocessed = clahe.apply(gray)

    kernel_sharpen = np.array([[-1, -1, -1], [-1, 10, -1], [-1, -1, -1]])
    sharpened = cv2.filter2D(preprocessed, -1, kernel_sharpen)

    _, global_thresh_img = cv2.threshold(sharpened, int(global_thresh), 255, cv2.THRESH_BINARY_INV)
    adaptive_thresh = cv2.adaptiveThreshold(
        sharpened,
        255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY_INV,
        adaptive_block_size,
        int(adaptive_C),
    )
    combined_thresh = cv2.bitwise_or(global_thresh_img, adaptive_thresh)

    kernel = _make_kernel(morph_kernel_size)
    opening = cv2.morphologyEx(combined_thresh, cv2.MORPH_OPEN, kernel, iterations=int(opening_iterations))
    dilated = cv2.dilate(opening, kernel, iterations=int(dilation_iterations))
    closing = cv2.morphologyEx(dilated, cv2.MORPH_CLOSE, kernel, iterations=int(closing_iterations))

    contours, _ = cv2.findContours(closing, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    annotated_bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    colonies: List[Dict[str, float]] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if min_area < area < max_area:
            x, y, w, h = cv2.boundingRect(contour)
            cx = x + w / 2.0
            cy = y + h / 2.0
            radius = max(w, h) / 2.0
            colonies.append({"x": float(cx), "y": float(cy), "radius": float(radius)})
            cv2.circle(annotated_bgr, (int(cx), int(cy)), max(1, int(radius)), (0, 255, 0), 2)

    annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)

    return {
        "count": len(colonies),
        "colonies": colonies,
        "mask": closing,
        "annotated": annotated_rgb,
    }


