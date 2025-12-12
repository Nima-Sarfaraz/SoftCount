import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_PARAMS,
  downloadResults,
  formatError,
  imageUrlFor,
  processImage,
  updateAnnotationsApi,
  uploadImages,
} from './api'
import CanvasViewer from './components/CanvasViewer'
import CountsSummary from './components/CountsSummary'
import ImageList from './components/ImageList'
import ParameterControls from './components/ParameterControls'
import UploadSection from './components/UploadSection'
import type {
  AnnotationResponse,
  Colony,
  DetectionParams,
  ManualEdits,
  ProcessResponse,
  UploadImageInfo,
} from './types'
import './App.css'

type Mode = 'view' | 'add' | 'remove'
type ViewMode = 'single' | 'split'

type DetectionMap = Record<string, ProcessResponse>
type AnnotationMap = Record<string, AnnotationResponse>
type ManualMap = Record<string, ManualEdits>
type ParamsMap = Record<string, DetectionParams>

const emptyManual: ManualEdits = { added: [], removed: [] }

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

const findNearestIndex = (point: { x: number; y: number }, colonies: Colony[], tolerance = 16): number => {
  let bestIdx = -1
  let bestDist = Number.MAX_VALUE
  colonies.forEach((colony, idx) => {
    const dist = distance(point, colony)
    const limit = Math.max(tolerance, colony.radius + 6)
    if (dist < bestDist && dist <= limit) {
      bestDist = dist
      bestIdx = idx
    }
  })
  return bestIdx
}

// Icons as inline SVGs
const ChevronIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6l4 4 4-4" />
  </svg>
)


const ViewIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
    <path d="M8 3.5a8.5 8.5 0 00-7.5 4.5 8.5 8.5 0 0015 0A8.5 8.5 0 008 3.5zm0 7.5a3 3 0 110-6 3 3 0 010 6z" />
  </svg>
)

const AddIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const RemoveIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
    <path d="M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const SplitIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
    <rect x="1" y="2" width="6" height="12" rx="1" />
    <rect x="9" y="2" width="6" height="12" rx="1" />
  </svg>
)

const SingleIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
    <rect x="2" y="2" width="12" height="12" rx="1" />
  </svg>
)

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [images, setImages] = useState<UploadImageInfo[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [params, setParams] = useState<DetectionParams>(DEFAULT_PARAMS)
  const [imageParams, setImageParams] = useState<ParamsMap>({})
  const [detections, setDetections] = useState<DetectionMap>({})
  const [annotations, setAnnotations] = useState<AnnotationMap>({})
  const [manual, setManual] = useState<ManualMap>({})
  const [mode, setMode] = useState<Mode>('view')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [livePreview, setLivePreview] = useState(true)
  const [status, setStatus] = useState<string | null>('Ready to start')
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAutoProcessing, setIsAutoProcessing] = useState(false)
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [paramsPanelOpen, setParamsPanelOpen] = useState(true)
  const debounceRef = useRef<number | null>(null)

  const selectedImage = images.find((img) => img.image_id === selectedImageId)
  const currentDetection = selectedImageId ? detections[selectedImageId] : undefined
  const currentAnnotation = selectedImageId ? annotations[selectedImageId] : undefined
  const manualForSelected = selectedImageId ? manual[selectedImageId] ?? emptyManual : emptyManual

  const counts = useMemo(() => {
    const auto = currentAnnotation?.auto_count ?? currentDetection?.count ?? 0
    const manualAdded = currentAnnotation?.manual_added ?? manualForSelected.added.length
    const manualRemoved = currentAnnotation?.manual_removed ?? manualForSelected.removed.length
    const finalCount = currentAnnotation?.final_count ?? auto + manualForSelected.added.length - manualForSelected.removed.length
    return { auto, manualAdded, manualRemoved, finalCount }
  }, [currentAnnotation, currentDetection, manualForSelected])

  const updateManualFor = (imageId: string, edits: ManualEdits) => {
    setManual((prev) => ({ ...prev, [imageId]: edits }))
  }

  // Save current params to imageParams when they change
  const updateParams = (newParams: DetectionParams) => {
    setParams(newParams)
    // Also persist to per-image storage for the currently selected image
    if (selectedImageId) {
      setImageParams((prev) => ({ ...prev, [selectedImageId]: newParams }))
    }
  }

  // Handle image selection: save current params, restore params for new image
  const handleSelectImage = (imageId: string) => {
    if (imageId === selectedImageId) return

    // Save current params to the previous image before switching
    if (selectedImageId) {
      setImageParams((prev) => ({ ...prev, [selectedImageId]: params }))
    }

    // Restore params for the newly selected image (or use defaults)
    const savedParams = imageParams[imageId]
    if (savedParams) {
      setParams(savedParams)
    }
    // If no saved params, keep current params (will be saved when user adjusts or switches away)

    setSelectedImageId(imageId)
  }

  const syncAnnotations = async (imageId: string, edits: ManualEdits, silent = false) => {
    setIsAnnotating(true)
    try {
      const response = await updateAnnotationsApi(imageId, {
        manual_added: edits.added,
        manual_removed: edits.removed,
      })
      setAnnotations((prev) => ({ ...prev, [imageId]: response }))
      if (!silent) {
        setStatus(`Saved. Final count: ${response.final_count}`)
      }
      return response
    } catch (error) {
      setStatus(`Annotation failed: ${formatError(error)}`)
      throw error
    } finally {
      setIsAnnotating(false)
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setIsUploading(true)
    setStatus('Uploading images...')
    try {
      const response = await uploadImages(Array.from(files), sessionId ?? undefined)
      setSessionId(response.session_id)
      setImages(response.images)
      
      // Save current params before switching to newly uploaded image
      if (selectedImageId) {
        setImageParams((prev) => ({ ...prev, [selectedImageId]: params }))
      }
      
      const firstImageId = response.images[0]?.image_id ?? null
      // New images don't have saved params yet, so we keep current params
      // (either defaults or what user had set on previous image)
      setSelectedImageId(firstImageId)
      setStatus(`Uploaded ${response.images.length} image(s)`)
    } catch (error) {
      setStatus(`Upload failed: ${formatError(error)}`)
    } finally {
      setIsUploading(false)
    }
  }

  const runDetection = async (opts?: { silent?: boolean; includeMask?: boolean }) => {
    const silent = opts?.silent ?? false
    const includeMask = opts?.includeMask ?? true

    if (!selectedImageId) {
      if (!silent) setStatus('Select an image first')
      return
    }

    if (silent) {
      setIsAutoProcessing(true)
    } else {
      setIsProcessing(true)
      setStatus('Running detection...')
    }

    try {
      const detection = await processImage(selectedImageId, params, { includeMask })
      setDetections((prev) => ({ ...prev, [selectedImageId]: detection }))
      if (!silent) {
        setStatus(`Detected ${detection.count} colonies`)
      }
      await syncAnnotations(selectedImageId, manual[selectedImageId] ?? emptyManual, true)
    } catch (error) {
      if (!silent) {
        setStatus(`Detection failed: ${formatError(error)}`)
      }
    } finally {
      if (silent) {
        setIsAutoProcessing(false)
      } else {
        setIsProcessing(false)
      }
    }
  }

  const handleProcess = () => runDetection({ silent: false, includeMask: true })

  const handleCanvasClick = async (point: { x: number; y: number }) => {
    if (!selectedImageId) return

    if (mode === 'add') {
      const current = manual[selectedImageId] ?? emptyManual
      const nextColony: Colony = { x: point.x, y: point.y, radius: 10 }
      const updated = { added: [...current.added, nextColony], removed: current.removed }
      updateManualFor(selectedImageId, updated)
      await syncAnnotations(selectedImageId, updated)
      return
    }

    if (mode === 'remove') {
      const current = manual[selectedImageId] ?? emptyManual
      const manualIdx = findNearestIndex(point, current.added, 20)
      if (manualIdx !== -1) {
        const updated = { added: current.added.filter((_, i) => i !== manualIdx), removed: current.removed }
        updateManualFor(selectedImageId, updated)
        await syncAnnotations(selectedImageId, updated)
        return
      }

      const autoColonies = detections[selectedImageId]?.colonies ?? []
      if (autoColonies.length === 0) {
        setStatus('Run detection first')
        return
      }

      const autoIdx = findNearestIndex(point, autoColonies, 22)
      if (autoIdx === -1) {
        setStatus('Click closer to a colony marker')
        return
      }

      const target = autoColonies[autoIdx]
      const removedIdx = findNearestIndex(target, current.removed, 12)
      const updatedRemoved =
        removedIdx !== -1 ? current.removed.filter((_, i) => i !== removedIdx) : [...current.removed, target]
      const updated = { added: current.added, removed: updatedRemoved }
      updateManualFor(selectedImageId, updated)
      await syncAnnotations(selectedImageId, updated)
    }
  }

  const handleResetParams = () => updateParams(DEFAULT_PARAMS)

  const handleDownload = async () => {
    if (!sessionId) {
      setStatus('Upload images first')
      return
    }
    setIsDownloading(true)
    setStatus('Preparing download...')
    try {
      const blob = await downloadResults(sessionId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `results_${sessionId}.csv`
      link.click()
      URL.revokeObjectURL(url)
      setStatus('CSV downloaded')
    } catch (error) {
      setStatus(`Download failed: ${formatError(error)}`)
    } finally {
      setIsDownloading(false)
    }
  }

  const maskDataUrl =
    selectedImageId && currentDetection?.mask_png ? `data:image/png;base64,${currentDetection.mask_png}` : undefined

  // Live preview on parameter tweaks
  useEffect(() => {
    if (!livePreview || !selectedImageId) return
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      runDetection({ silent: true, includeMask: true })
    }, 500)
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, selectedImageId, livePreview])

  const modeButtons = [
    { mode: 'view' as Mode, label: 'View', icon: ViewIcon },
    { mode: 'add' as Mode, label: 'Add', icon: AddIcon },
    { mode: 'remove' as Mode, label: 'Remove', icon: RemoveIcon },
  ]

  const isLoading = isAutoProcessing || isAnnotating

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-brand">
          <div className="app-logo">SC</div>
          <div>
            <div className="app-title">Soft Agar Colony Counter</div>
            <div className="app-subtitle">Automated detection & annotation</div>
          </div>
        </div>

        <div className={`status-bar ${isLoading ? 'processing' : ''}`}>
          <span className="status-icon" />
          <span className="status-text">{status}</span>
        </div>

        <div className="toolbar-group">
          <button className="btn btn-primary" onClick={handleDownload} disabled={!sessionId || isDownloading}>
            {isDownloading ? 'Downloading...' : 'Export CSV'}
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main className="app-main">
        {/* Left Sidebar - Parameters */}
        <aside className={`sidebar-left ${leftSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            {!leftSidebarCollapsed && <span className="sidebar-title">Controls</span>}
            <button
              className="sidebar-toggle"
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              title={leftSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {leftSidebarCollapsed ? '→' : '←'}
            </button>
          </div>

          {!leftSidebarCollapsed && (
            <div className="sidebar-content">
              {/* Upload */}
              <UploadSection onUpload={handleUpload} isUploading={isUploading} />

              {/* Parameters Panel */}
              <div className={`panel ${paramsPanelOpen ? '' : 'collapsed'}`}>
                <div className="panel-header" onClick={() => setParamsPanelOpen(!paramsPanelOpen)}>
                  <div className="panel-header-left">
                    <span className="panel-title">Detection Parameters</span>
                  </div>
                  <ChevronIcon className="panel-chevron" />
                </div>
                {paramsPanelOpen && (
                  <div className="panel-content">
                    <ParameterControls
                      params={params}
                      onChange={updateParams}
                      onReset={handleResetParams}
                      onProcess={handleProcess}
                      processing={isProcessing}
                      disabled={!selectedImageId}
                    />
                  </div>
                )}
              </div>

              {/* Live Preview Toggle */}
              <div className="option-row">
                <div className="option-label">
                  <span className="option-title">Live Preview</span>
                  <span className="option-desc">Auto-update on parameter changes</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={livePreview} onChange={(e) => setLivePreview(e.target.checked)} />
                  <div className="toggle-track">
                    <div className="toggle-thumb" />
                  </div>
                </label>
              </div>

              {/* Legend */}
              <div className="legend">
                <div className="legend-title">Legend</div>
                <div className="legend-item">
                  <span className="legend-dot auto" />
                  Auto-detected colonies
                </div>
                <div className="legend-item">
                  <span className="legend-dot added" />
                  Manually added
                </div>
                <div className="legend-item">
                  <span className="legend-dot removed" />
                  Marked for removal
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Center - Canvas Area */}
        <div className="canvas-area">
          {/* Canvas Toolbar */}
          <div className="canvas-toolbar">
            <div className="toolbar-group">
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '8px' }}>Mode:</span>
              <div className="btn-group">
                {modeButtons.map((btn) => (
                  <button
                    key={btn.mode}
                    className={`btn ${mode === btn.mode ? 'active' : ''}`}
                    onClick={() => setMode(btn.mode)}
                    title={btn.label}
                  >
                    <btn.icon />
                    <span>{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '8px' }}>View:</span>
              <div className="btn-group">
                <button
                  className={`btn ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => setViewMode('split')}
                  title="Split view (Image + Mask)"
                >
                  <SplitIcon />
                  <span>Split</span>
                </button>
                <button
                  className={`btn ${viewMode === 'single' ? 'active' : ''}`}
                  onClick={() => setViewMode('single')}
                  title="Single view (Image only)"
                >
                  <SingleIcon />
                  <span>Single</span>
                </button>
              </div>
            </div>

            <div style={{ flex: 1 }} />

            <div className="toolbar-group">
              {selectedImage && (
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {selectedImage.filename}
                </span>
              )}
            </div>
          </div>

          {/* Canvas Container */}
          <CanvasViewer
            imageUrl={selectedImageId ? imageUrlFor(selectedImageId) : undefined}
            maskUrl={maskDataUrl}
            autoColonies={currentDetection?.colonies}
            manualAdded={manualForSelected.added}
            manualRemoved={manualForSelected.removed}
            mode={mode}
            viewMode={viewMode}
            onCanvasClick={handleCanvasClick}
            annotating={isAnnotating}
            autoProcessing={isAutoProcessing}
          />
        </div>

        {/* Right Sidebar - Images & Stats */}
        <aside className="sidebar-right">
          <div className="sidebar-header">
            <span className="sidebar-title">Session</span>
          </div>
          <div className="sidebar-content">
            <ImageList
              images={images}
              selectedId={selectedImageId}
              detections={detections}
              annotations={annotations}
              onSelect={handleSelectImage}
            />

            <CountsSummary
              filename={selectedImage?.filename}
              autoCount={counts.auto}
              manualAdded={counts.manualAdded}
              manualRemoved={counts.manualRemoved}
              finalCount={counts.finalCount}
              sessionId={sessionId}
              onDownload={handleDownload}
              downloading={isDownloading}
            />
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
