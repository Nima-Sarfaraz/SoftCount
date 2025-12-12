import type { AnnotationResponse, ProcessResponse, UploadImageInfo } from '../types'

type Props = {
  images: UploadImageInfo[]
  selectedId: string | null
  detections: Record<string, ProcessResponse>
  annotations: Record<string, AnnotationResponse>
  onSelect: (imageId: string) => void
}

const ImageIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" style={{ color: 'var(--text-disabled)' }}>
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <circle cx="5.5" cy="5.5" r="1.5" />
    <path d="M14 10l-3-3-4 4-2-2-3 3" />
  </svg>
)

const ImageList = ({ images, selectedId, detections, annotations, onSelect }: Props) => {
  if (images.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header" style={{ cursor: 'default' }}>
          <span className="panel-title">Images</span>
          <span className="panel-badge">0</span>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <ImageIcon />
            <span className="empty-text">No images uploaded yet</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-header" style={{ cursor: 'default' }}>
        <span className="panel-title">Images</span>
        <span className="panel-badge">{images.length}</span>
      </div>
      <div className="panel-content" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <ul className="image-list">
          {images.map((img) => {
            const detection = detections[img.image_id]
            const annotation = annotations[img.image_id]
            const count = annotation?.final_count ?? detection?.count
            return (
              <li
                key={img.image_id}
                className={`image-item ${selectedId === img.image_id ? 'selected' : ''}`}
                onClick={() => onSelect(img.image_id)}
              >
                <div className="image-item-info">
                  <div className="image-item-name">{img.filename}</div>
                  <div className="image-item-id">{img.image_id.slice(0, 12)}...</div>
                </div>
                <div className="image-item-count">{count ?? '—'}</div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default ImageList
