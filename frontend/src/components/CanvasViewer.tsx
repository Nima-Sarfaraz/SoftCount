import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Circle, Line, Rect, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import useImage from 'use-image'
import type { Colony } from '../types'

type Mode = 'view' | 'add' | 'remove'
type ViewMode = 'single' | 'split'

type Props = {
  imageUrl?: string
  maskUrl?: string
  autoColonies?: Colony[]
  manualAdded: Colony[]
  manualRemoved: Colony[]
  mode: Mode
  viewMode: ViewMode
  onCanvasClick: (point: { x: number; y: number }) => void
  annotating?: boolean
  autoProcessing?: boolean
}

/**
 * Custom hook for smooth cross-fade transitions between mask images.
 * Manages HTMLImageElement objects directly to avoid flash during loading.
 * Keeps the old image visible until the new one is fully loaded.
 * Handles rapid changes correctly by always tracking the latest URL.
 */
const useCrossFadeMask = (maskUrl: string | undefined) => {
  // Store actual image elements, not URLs
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null)
  const [previousImage, setPreviousImage] = useState<HTMLImageElement | null>(null)
  const [fadeProgress, setFadeProgress] = useState(1)
  
  // Refs for tracking state across async operations
  const latestUrlRef = useRef<string | undefined>(maskUrl)
  const animationRef = useRef<number | null>(null)
  const currentImageRef = useRef<HTMLImageElement | null>(null)
  
  // Keep currentImageRef in sync
  currentImageRef.current = currentImage

  // Update latest URL ref synchronously (before the effect runs)
  latestUrlRef.current = maskUrl

  useEffect(() => {
    // If URL cleared, fade out current image
    if (!maskUrl) {
      if (currentImageRef.current) {
        setPreviousImage(currentImageRef.current)
        setCurrentImage(null)
        setFadeProgress(0)
        // Animate fade out
        const startTime = performance.now()
        const animate = (time: number) => {
          const progress = Math.min((time - startTime) / 200, 1)
          setFadeProgress(progress)
          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate)
          } else {
            setPreviousImage(null)
          }
        }
        animationRef.current = requestAnimationFrame(animate)
      }
      return
    }

    // Skip if this URL matches current image's src
    if (currentImageRef.current?.src === maskUrl) return

    // Start loading new image - capture the URL for this specific load
    const urlToLoad = maskUrl
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      // Only apply if this is still the latest requested URL
      // This handles rapid changes - only the most recent URL wins
      if (latestUrlRef.current !== urlToLoad) {
        return
      }

      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }

      // Get the current image at this moment (not from closure)
      const existingImage = currentImageRef.current
      const hadPrevious = existingImage !== null

      // Move current to previous for cross-fade
      if (hadPrevious) {
        setPreviousImage(existingImage)
      }
      
      // Set new image
      setCurrentImage(img)
      
      // Animate cross-fade if there was a previous image
      if (hadPrevious) {
        setFadeProgress(0)
        const startTime = performance.now()
        const duration = 180 // ms
        
        const animate = (time: number) => {
          const elapsed = time - startTime
          const progress = Math.min(elapsed / duration, 1)
          // easeOutCubic for smooth deceleration
          const eased = 1 - Math.pow(1 - progress, 3)
          setFadeProgress(eased)
          
          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate)
          } else {
            // Animation complete - clear previous image
            setPreviousImage(null)
            animationRef.current = null
          }
        }
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // No animation needed for first image
        setFadeProgress(1)
      }
    }

    img.onerror = () => {
      // Image failed to load - do nothing, keep existing image
    }

    img.src = urlToLoad

    return () => {
      // Cleanup: cancel animation but don't clear images (to avoid flash)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [maskUrl]) // Only depend on maskUrl - use refs for other state

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return {
    currentImage,
    previousImage,
    currentOpacity: fadeProgress,
    previousOpacity: 1 - fadeProgress,
    isTransitioning: fadeProgress < 1 && fadeProgress > 0,
  }
}

// Zoom icon component
const ZoomIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
    <circle cx="7" cy="7" r="5" />
    <path d="M11 11l3.5 3.5" strokeLinecap="round" />
  </svg>
)

// Reusable canvas pane component
const CanvasPane = ({
  label,
  dotClass,
  image,
  // Support for cross-fading between images
  previousImage,
  imageOpacity = 1,
  previousImageOpacity = 0,
  naturalWidth,
  naturalHeight,
  scale,
  mode,
  onScaleChange,
  onFitClick,
  autoColonies,
  manualAdded,
  manualRemoved,
  onClick,
  showOverlays = true,
  isProcessing = false,
  isLoading = false,
  hasImageUrl = false,
}: {
  label: string
  dotClass: string
  image: HTMLImageElement | undefined | null
  previousImage?: HTMLImageElement | undefined | null
  imageOpacity?: number
  previousImageOpacity?: number
  naturalWidth: number
  naturalHeight: number
  scale: number
  mode: Mode
  onScaleChange: (scale: number) => void
  onFitClick: () => void
  autoColonies?: Colony[]
  manualAdded: Colony[]
  manualRemoved: Colony[]
  onClick?: (point: { x: number; y: number }) => void
  showOverlays?: boolean
  isProcessing?: boolean
  isLoading?: boolean
  hasImageUrl?: boolean
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const stageWidth = naturalWidth * scale
  const stageHeight = naturalHeight * scale

  const handleClick = (evt: KonvaEventObject<MouseEvent>) => {
    if (mode === 'view' || !onClick) return
    const stage = evt.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer) return
    onClick({ x: pointer.x / scale, y: pointer.y / scale })
  }

  return (
    <div className="canvas-pane">
      <div className="canvas-pane-header">
        <div className="canvas-pane-label">
          <span className={`dot ${dotClass}${isProcessing ? ' processing' : ''}`} />
          {label}
          {isProcessing && <span className="processing-indicator">updating...</span>}
        </div>
        <div className="zoom-control">
          <ZoomIcon />
          <input
            type="range"
            className="zoom-slider"
            min={0.1}
            max={2}
            step={0.05}
            value={scale}
            onChange={(e) => onScaleChange(Number(e.target.value))}
          />
          <span className="zoom-value">{Math.round(scale * 100)}%</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onScaleChange(1)}>
            100%
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onFitClick}>
            Fit
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className={`canvas-wrapper mode-${mode}`}
      >
        {!image ? (
          <div className="canvas-placeholder">
            {isLoading ? (
              <>
                <div className="spinner" />
                Loading image...
              </>
            ) : hasImageUrl ? (
              'Preparing image...'
            ) : (
              'Select an image and run detection'
            )}
          </div>
        ) : (
          <Stage
            width={stageWidth}
            height={stageHeight}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={handleClick}
          >
            <Layer listening={false}>
              <Rect width={naturalWidth} height={naturalHeight} fill="#0f172a" />
              {/* Previous image (fading out during transition) */}
              {previousImage && previousImageOpacity > 0.01 && (
                <KonvaImage 
                  image={previousImage} 
                  width={naturalWidth} 
                  height={naturalHeight} 
                  opacity={0.95 * previousImageOpacity} 
                />
              )}
              {/* Current image (fading in during transition, or fully visible) */}
              {image && (
                <KonvaImage 
                  image={image} 
                  width={naturalWidth} 
                  height={naturalHeight} 
                  opacity={0.95 * imageOpacity} 
                />
              )}
            </Layer>
            {showOverlays && (
              <Layer>
                {/* Auto-detected colonies - neon cyan with subtle inner fill */}
                {autoColonies?.map((colony, idx) => {
                  const displayRadius = Math.max(8, colony.radius + 7) // Visual padding
                  return (
                    <Group key={`auto-${idx}`}>
                      {/* Subtle inner fill */}
                      <Circle
                        x={colony.x}
                        y={colony.y}
                        radius={displayRadius}
                        fill="rgba(0,180,216,0.12)"
                      />
                      {/* Neon cyan stroke */}
                      <Circle
                        x={colony.x}
                        y={colony.y}
                        radius={displayRadius}
                        stroke="#00e5ff"
                        strokeWidth={3.5}
                      />
                    </Group>
                  )
                })}
                {/* Manually added colonies - neon green with subtle inner fill */}
                {manualAdded.map((colony, idx) => {
                  const displayRadius = Math.max(10, colony.radius + 7)
                  return (
                    <Group key={`add-${idx}`}>
                      {/* Subtle inner fill */}
                      <Circle
                        x={colony.x}
                        y={colony.y}
                        radius={displayRadius}
                        fill="rgba(0,230,64,0.12)"
                      />
                      {/* Neon green stroke */}
                      <Circle
                        x={colony.x}
                        y={colony.y}
                        radius={displayRadius}
                        stroke="#39ff14"
                        strokeWidth={3.5}
                        dash={[6, 4]}
                      />
                    </Group>
                  )
                })}
                {/* Manually removed colonies - neon red/pink with X */}
                {manualRemoved.map((colony, idx) => {
                  const displayRadius = Math.max(10, colony.radius + 7)
                  return (
                    <Group key={`remove-${idx}`}>
                      {/* Subtle inner fill */}
                      <Circle
                        x={colony.x}
                        y={colony.y}
                        radius={displayRadius}
                        fill="rgba(255,50,80,0.12)"
                      />
                      {/* Neon red/pink stroke and X */}
                      <Circle
                        x={colony.x}
                        y={colony.y}
                        radius={displayRadius}
                        stroke="#ff3366"
                        strokeWidth={3.5}
                      />
                      <Line
                        points={[colony.x - displayRadius * 0.7, colony.y - displayRadius * 0.7, colony.x + displayRadius * 0.7, colony.y + displayRadius * 0.7]}
                        stroke="#ff3366"
                        strokeWidth={3.5}
                        lineCap="round"
                      />
                      <Line
                        points={[colony.x - displayRadius * 0.7, colony.y + displayRadius * 0.7, colony.x + displayRadius * 0.7, colony.y - displayRadius * 0.7]}
                        stroke="#ff3366"
                        strokeWidth={3.5}
                        lineCap="round"
                      />
                    </Group>
                  )
                })}
              </Layer>
            )}
          </Stage>
        )}
      </div>
    </div>
  )
}

const CanvasViewer = ({
  imageUrl,
  maskUrl,
  autoColonies = [],
  manualAdded,
  manualRemoved,
  mode,
  viewMode,
  onCanvasClick,
  annotating = false,
  autoProcessing = false,
}: Props) => {
  const [image, imageStatus] = useImage(imageUrl ?? '', 'anonymous')
  const isImageLoading = !!imageUrl && imageStatus === 'loading'
  
  // Use cross-fade hook for smooth mask transitions
  // This returns actual HTMLImageElement objects, not URLs
  const {
    currentImage: maskImage,
    previousImage: previousMaskImage,
    currentOpacity: maskOpacity,
    previousOpacity: previousMaskOpacity,
  } = useCrossFadeMask(maskUrl)
  
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [containerHeight, setContainerHeight] = useState(600)

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      setContainerWidth(entry.contentRect.width)
      setContainerHeight(entry.contentRect.height)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const naturalWidth = image?.naturalWidth ?? image?.width ?? 960
  const naturalHeight = image?.naturalHeight ?? image?.height ?? 720

  // Calculate fit scale based on available space
  const paneWidth = viewMode === 'split' ? (containerWidth - 16) / 2 : containerWidth - 8
  const paneHeight = containerHeight - 80 // Account for header

  const fitScale = useMemo(() => {
    const scale = Math.min(paneWidth / naturalWidth, paneHeight / naturalHeight, 1)
    return Number.isFinite(scale) && scale > 0 ? scale : 1
  }, [paneWidth, paneHeight, naturalWidth, naturalHeight])

  const [imageScale, setImageScale] = useState(1)
  const [maskScale, setMaskScale] = useState(1)

  // Sync scales when image changes
  useEffect(() => {
    setImageScale(fitScale)
    setMaskScale(fitScale)
  }, [fitScale, imageUrl])

  // Determine if we should show a non-intrusive processing indicator
  // Only show overlay for explicit user actions (not live preview)
  const showProcessingOverlay = annotating

  return (
    <div className="canvas-container" ref={containerRef}>
      {/* Image Pane */}
      <CanvasPane
        label="Original Image"
        dotClass="image"
        image={image}
        naturalWidth={naturalWidth}
        naturalHeight={naturalHeight}
        scale={imageScale}
        mode={mode}
        onScaleChange={setImageScale}
        onFitClick={() => setImageScale(fitScale)}
        autoColonies={autoColonies}
        manualAdded={manualAdded}
        manualRemoved={manualRemoved}
        onClick={onCanvasClick}
        showOverlays={true}
        isLoading={isImageLoading}
        hasImageUrl={!!imageUrl}
      />

      {/* Mask Pane - only show in split view */}
      {viewMode === 'split' && (
        <CanvasPane
          label="Detection Mask"
          dotClass="mask"
          image={maskImage ?? image}
          previousImage={previousMaskImage ?? undefined}
          imageOpacity={maskImage ? maskOpacity : 1}
          previousImageOpacity={previousMaskImage ? previousMaskOpacity : 0}
          naturalWidth={naturalWidth}
          naturalHeight={naturalHeight}
          scale={maskScale}
          mode="view"
          onScaleChange={setMaskScale}
          onFitClick={() => setMaskScale(fitScale)}
          autoColonies={autoColonies}
          manualAdded={manualAdded}
          manualRemoved={manualRemoved}
          showOverlays={!maskImage} // Show overlays if no mask yet
          isProcessing={autoProcessing}
          isLoading={isImageLoading}
          hasImageUrl={!!imageUrl}
        />
      )}

      {/* Loading overlay - only for explicit save actions, not live preview */}
      {showProcessingOverlay && (
        <div className="canvas-overlay">
          <div className="canvas-overlay-content">
            <div className="spinner" />
            Saving...
          </div>
        </div>
      )}
    </div>
  )
}

export default CanvasViewer
