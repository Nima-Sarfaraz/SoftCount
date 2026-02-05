"""Lightweight storage layer for the FastAPI service.

Images are persisted to disk under a local data directory, while metadata
annotations live in memory for simplicity. This is intentionally minimal and
suited for single-process development workloads.
"""

from __future__ import annotations

import logging
import mimetypes
from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock
from typing import Dict, Iterable, List, Sequence
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class ImageRecord:
    """Metadata for a single uploaded image."""

    image_id: str
    session_id: str
    filename: str
    path: Path
    manual_added: List[Dict[str, float]] = field(default_factory=list)
    manual_removed: List[Dict[str, float]] = field(default_factory=list)
    auto_colonies: List[Dict[str, float]] = field(default_factory=list)
    last_detection_count: int = 0
    last_parameters: Dict[str, object] | None = None


class Storage:
    """Thread-safe in-memory metadata store backed by a local file cache."""

    def __init__(self, base_dir: Path | None = None) -> None:
        self.base_dir = base_dir or Path(__file__).resolve().parent / "_data"
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._sessions: Dict[str, List[str]] = {}
        self._images: Dict[str, ImageRecord] = {}

        # Clean up orphaned files from previous sessions
        self._cleanup_on_startup()

    def _cleanup_on_startup(self) -> None:
        """Remove leftover image files from previous sessions.

        Since session metadata is stored in memory, any files remaining from
        a previous run are orphaned and can be safely deleted.
        """
        count = 0
        for f in self.base_dir.iterdir():
            if f.is_file():
                try:
                    f.unlink()
                    count += 1
                except OSError as e:
                    logger.warning(f"Failed to remove orphaned file {f}: {e}")

        if count > 0:
            logger.info(f"Cleaned up {count} orphaned file(s) from previous session")

    def ensure_session(self, session_id: str | None = None) -> str:
        """Return a session id, creating one if needed."""
        session_id = session_id or uuid4().hex
        with self._lock:
            self._sessions.setdefault(session_id, [])
        return session_id

    def store_image(self, session_id: str, filename: str, data: bytes) -> str:
        """Persist an uploaded image and return its new image id."""
        safe_name = Path(filename).name or "upload"
        image_id = uuid4().hex
        suffix = Path(safe_name).suffix or ".bin"
        path = self.base_dir / f"{image_id}{suffix}"
        path.write_bytes(data)

        record = ImageRecord(
            image_id=image_id,
            session_id=session_id,
            filename=safe_name,
            path=path,
        )
        with self._lock:
            self._images[image_id] = record
            self._sessions.setdefault(session_id, []).append(image_id)
        return image_id

    def get_image(self, image_id: str) -> ImageRecord:
        """Return the image record or raise KeyError."""
        with self._lock:
            if image_id not in self._images:
                raise KeyError(image_id)
            return self._images[image_id]

    def save_detection(
        self,
        image_id: str,
        colonies: Sequence[Dict[str, float]],
        count: int,
        parameters: Dict[str, object],
    ) -> ImageRecord:
        """Persist the latest detection result for an image."""
        with self._lock:
            record = self._require_image(image_id)
            record.auto_colonies = list(colonies)
            record.last_detection_count = int(count)
            record.last_parameters = dict(parameters)
            return record

    def update_annotations(
        self,
        image_id: str,
        manual_added: Iterable[Dict[str, float]] | None = None,
        manual_removed: Iterable[Dict[str, float]] | None = None,
    ) -> ImageRecord:
        """Replace manual annotations for an image."""
        with self._lock:
            record = self._require_image(image_id)
            if manual_added is not None:
                record.manual_added = list(manual_added)
            if manual_removed is not None:
                record.manual_removed = list(manual_removed)
            return record

    def get_session_records(self, session_id: str) -> List[ImageRecord]:
        """Return all image records for a session."""
        with self._lock:
            image_ids = self._sessions.get(session_id, [])
            return [self._images[iid] for iid in image_ids if iid in self._images]

    def final_count(self, record: ImageRecord) -> int:
        """Compute final count blending auto and manual annotations."""
        return int(record.last_detection_count) + len(record.manual_added) - len(record.manual_removed)

    def guess_media_type(self, filename: str) -> str | None:
        """Best-effort MIME type for an image filename."""
        media_type, _ = mimetypes.guess_type(filename)
        return media_type

    def _require_image(self, image_id: str) -> ImageRecord:
        if image_id not in self._images:
            raise KeyError(image_id)
        return self._images[image_id]


# Singleton storage used by the FastAPI app.
default_storage = Storage()

