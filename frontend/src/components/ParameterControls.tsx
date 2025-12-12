import type { DetectionParams } from '../types'

type Props = {
  params: DetectionParams
  onChange: (next: DetectionParams) => void
  onReset: () => void
  onProcess: () => void
  processing: boolean
  disabled?: boolean
}

type FieldGroup = {
  label: string
  fields: Array<{
    key: keyof DetectionParams
    label: string
    min: number
    max: number
    step: number
  }>
}

const fieldGroups: FieldGroup[] = [
  {
    label: 'Threshold',
    fields: [
      { key: 'global_thresh', label: 'Global', min: 0, max: 255, step: 1 },
      { key: 'adaptive_block_size', label: 'Block size', min: 3, max: 99, step: 2 },
      { key: 'adaptive_C', label: 'Adaptive C', min: 0, max: 20, step: 1 },
    ],
  },
  {
    label: 'Morphology',
    fields: [
      { key: 'morph_kernel_size', label: 'Kernel', min: 1, max: 15, step: 1 },
      { key: 'opening_iterations', label: 'Opening', min: 0, max: 8, step: 1 },
      { key: 'dilation_iterations', label: 'Dilation', min: 0, max: 8, step: 1 },
      { key: 'closing_iterations', label: 'Closing', min: 0, max: 12, step: 1 },
    ],
  },
  {
    label: 'Size Filter',
    fields: [
      { key: 'min_area', label: 'Min area', min: 50, max: 8000, step: 25 },
      { key: 'max_area', label: 'Max area', min: 1000, max: 25000, step: 50 },
    ],
  },
  {
    label: 'CLAHE',
    fields: [
      { key: 'clahe_clip_limit', label: 'Clip limit', min: 0.5, max: 5, step: 0.1 },
      { key: 'clahe_tile_grid_size', label: 'Tile grid', min: 2, max: 32, step: 1 },
    ],
  },
]

const ParameterControls = ({ params, onChange, onReset, onProcess, processing, disabled }: Props) => {
  const handleFieldChange = (key: keyof DetectionParams, value: number) => {
    onChange({ ...params, [key]: value })
  }

  return (
    <div className="param-group">
      {fieldGroups.map((group) => (
        <div key={group.label}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {group.label}
          </div>
          {group.fields.map((field) => (
            <div key={field.key} className="param-row">
              <div className="param-label">
                <span className="name">{field.label}</span>
                <span className="value">{params[field.key]}</span>
              </div>
              <input
                type="range"
                className="param-slider"
                min={field.min}
                max={field.max}
                step={field.step}
                value={params[field.key]}
                onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button className="btn btn-default" onClick={onReset} disabled={disabled || processing} style={{ flex: 1, minWidth: '70px' }}>
          Reset
        </button>
        <button className="btn btn-primary" onClick={onProcess} disabled={disabled || processing} style={{ flex: 2, minWidth: '90px' }}>
          {processing ? 'Running...' : 'Run Detection'}
        </button>
      </div>
    </div>
  )
}

export default ParameterControls
