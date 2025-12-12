"""Pydantic models for the FastAPI layer."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Colony(BaseModel):
    """Colony coordinate and approximate radius."""

    model_config = ConfigDict(extra="forbid")

    x: float = Field(..., description="X coordinate (pixels)")
    y: float = Field(..., description="Y coordinate (pixels)")
    radius: float = Field(..., ge=0, description="Approximate radius (pixels)")


class DetectionParams(BaseModel):
    """Engine parameters mirrored from softagar.engine.detect_colonies."""

    model_config = ConfigDict(extra="forbid")

    global_thresh: int = Field(127, ge=0, le=255)
    adaptive_block_size: int = Field(21, ge=3)
    adaptive_C: int = Field(4, ge=0)
    morph_kernel_size: int = Field(3, ge=1)
    opening_iterations: int = Field(2, ge=0)
    dilation_iterations: int = Field(3, ge=0)
    closing_iterations: int = Field(6, ge=0)
    min_area: int = Field(525, ge=1)
    max_area: int = Field(15000, ge=1)
    clahe_clip_limit: float = Field(2.0, gt=0)
    clahe_tile_grid_size: int = Field(8, ge=1)

    @model_validator(mode="after")
    def _validate_area(self) -> "DetectionParams":
        if self.max_area <= self.min_area:
            raise ValueError("max_area must be greater than min_area")
        return self


class UploadImageInfo(BaseModel):
    """Metadata for an uploaded image."""

    model_config = ConfigDict(extra="forbid")

    image_id: str
    filename: str


class UploadResponse(BaseModel):
    """Response for /upload."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    images: List[UploadImageInfo]


class ProcessResponse(BaseModel):
    """Response for /process/{image_id}."""

    model_config = ConfigDict(extra="forbid")

    image_id: str
    session_id: str
    count: int
    colonies: List[Colony]
    parameters: DetectionParams
    mask_png: str | None = None


class AnnotationRequest(BaseModel):
    """Manual annotation payload."""

    model_config = ConfigDict(extra="forbid")

    manual_added: List[Colony] = Field(default_factory=list)
    manual_removed: List[Colony] = Field(default_factory=list)


class AnnotationResponse(BaseModel):
    """Summary of applied manual annotations."""

    model_config = ConfigDict(extra="forbid")

    image_id: str
    session_id: str
    auto_count: int
    manual_added: int
    manual_removed: int
    final_count: int

