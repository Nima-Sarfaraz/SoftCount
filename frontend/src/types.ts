export interface Colony {
  x: number
  y: number
  radius: number
}

export interface DetectionParams {
  global_thresh: number
  adaptive_block_size: number
  adaptive_C: number
  morph_kernel_size: number
  opening_iterations: number
  dilation_iterations: number
  closing_iterations: number
  min_area: number
  max_area: number
  clahe_clip_limit: number
  clahe_tile_grid_size: number
}

export interface UploadImageInfo {
  image_id: string
  filename: string
}

export interface UploadResponse {
  session_id: string
  images: UploadImageInfo[]
}

export interface ProcessResponse {
  image_id: string
  session_id: string
  count: number
  colonies: Colony[]
  parameters: DetectionParams
  mask_png?: string | null
}

export interface AnnotationResponse {
  image_id: string
  session_id: string
  auto_count: number
  manual_added: number
  manual_removed: number
  final_count: number
}

export interface ManualEdits {
  added: Colony[]
  removed: Colony[]
}

