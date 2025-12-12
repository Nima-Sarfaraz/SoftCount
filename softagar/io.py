"""IO helpers for reading/writing images and CSV outputs."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any, Dict, List, Sequence

import numpy as np
from PIL import Image


def load_image(path: str | Path) -> np.ndarray:
    """Load an image file into an RGB NumPy array."""
    path = Path(path)
    with Image.open(path) as img:
        return np.array(img.convert("RGB"))


def save_image(path: str | Path, img: np.ndarray) -> None:
    """Save an RGB NumPy array to disk."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img).save(path)


def write_results_csv(results: Sequence[Dict[str, Any]], path: str | Path) -> None:
    """
    Persist colony counting results to CSV.

    Args:
        results: Iterable of dictionaries that must include at least
                 `filename` and `count`. Additional keys will be persisted.
        path: Output CSV path.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    results = list(results)
    if not results:
        path.write_text("filename,count\n")
        return

    # Determine all field names while ensuring filename/count first.
    extra_fields: List[str] = []
    for entry in results:
        for key in entry.keys():
            if key not in {"filename", "count"} and key not in extra_fields:
                extra_fields.append(key)
    fieldnames = ["filename", "count", *extra_fields]

    with path.open("w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for row in results:
            sanitized = {field: row.get(field, "") for field in fieldnames}
            writer.writerow(sanitized)


