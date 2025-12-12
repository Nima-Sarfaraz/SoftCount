import { useRef, useState } from 'react'

type Props = {
  onUpload: (files: FileList | null) => void
  isUploading: boolean
}

const UploadIcon = () => (
  <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 16V4m0 0L8 8m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const UploadSection = ({ onUpload, isUploading }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    onUpload(e.dataTransfer.files)
  }

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <UploadIcon />
      <span className="upload-text">
        {isUploading ? 'Uploading...' : 'Drop images or click to upload'}
      </span>
      <span className="upload-hint">TIFF, PNG, JPG supported</span>
      <input
        ref={inputRef}
        className="upload-input"
        type="file"
        accept="image/*,.tif,.tiff"
        multiple
        onChange={(e) => onUpload(e.target.files)}
        disabled={isUploading}
      />
    </div>
  )
}

export default UploadSection
