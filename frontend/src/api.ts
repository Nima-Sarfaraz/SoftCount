import axios from 'axios'
import type { AnnotationResponse, Colony, DetectionParams, ProcessResponse, UploadResponse } from './types'

// Determine API base URL:
// - In production (served from same origin as API): use empty string for relative URLs
// - In development with Vite dev server: use VITE_API_BASE_URL or default to port 8000
const getBaseUrl = (): string => {
  // If explicitly set, use that
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (envUrl !== undefined && envUrl !== '') {
    return envUrl.replace(/\/$/, '')
  }
  
  // If we're on port 8000, assume same-origin (production build served by FastAPI)
  if (typeof window !== 'undefined' && window.location.port === '8000') {
    return ''
  }
  
  // Default for dev server (port 5173) - connect to API on port 8000
  return 'http://127.0.0.1:8000'
}

const configuredBaseUrl = getBaseUrl()

export const DEFAULT_PARAMS: DetectionParams = {
  global_thresh: 127,
  adaptive_block_size: 21,
  adaptive_C: 4,
  morph_kernel_size: 3,
  opening_iterations: 2,
  dilation_iterations: 3,
  closing_iterations: 6,
  min_area: 525,
  max_area: 15000,
  clahe_clip_limit: 2.0,
  clahe_tile_grid_size: 8,
}

const client = axios.create({
  baseURL: configuredBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

export const uploadImages = async (files: File[], sessionId?: string): Promise<UploadResponse> => {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const response = await client.post<UploadResponse>('/upload', formData, {
    params: sessionId ? { session_id: sessionId } : undefined,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const processImage = async (
  imageId: string,
  params: DetectionParams,
  options?: { includeMask?: boolean },
): Promise<ProcessResponse> => {
  const includeMask = options?.includeMask ?? false
  const path = includeMask ? `/process/${imageId}/with-mask` : `/process/${imageId}`
  const response = await client.post<ProcessResponse>(path, params, {
    params: includeMask ? { include_mask: true } : undefined,
  })
  return response.data
}

export const updateAnnotationsApi = async (
  imageId: string,
  payload: { manual_added: Colony[]; manual_removed: Colony[] },
): Promise<AnnotationResponse> => {
  const response = await client.post<AnnotationResponse>(`/annotations/${imageId}`, payload)
  return response.data
}

export const downloadResults = async (sessionId: string): Promise<Blob> => {
  const response = await client.get(`/results/${sessionId}`, { responseType: 'blob' })
  return response.data
}

// Stable preview URL (no cache-busting per render to avoid flicker).
export const imageUrlFor = (imageId: string): string => `${configuredBaseUrl}/image/${imageId}/preview`

export const formatError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    return error.message
  }
  return error instanceof Error ? error.message : 'Unexpected error'
}

