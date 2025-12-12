type Props = {
  filename?: string
  autoCount: number
  manualAdded: number
  manualRemoved: number
  finalCount: number
  sessionId?: string | null
  onDownload: () => void
  downloading: boolean
}

const CountsSummary = ({
  filename,
  autoCount,
  manualAdded,
  manualRemoved,
  finalCount,
  sessionId,
}: Props) => {
  return (
    <div className="panel">
      <div className="panel-header" style={{ cursor: 'default' }}>
        <span className="panel-title">Counts</span>
        {filename && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {filename.length > 20 ? filename.slice(0, 17) + '...' : filename}
          </span>
        )}
      </div>
      <div className="panel-content">
        <div className="counts-panel">
          <div className="counts-grid">
            <div className="count-item">
              <span className="count-label">Auto</span>
              <span className="count-value">{autoCount}</span>
            </div>
            <div className="count-item">
              <span className="count-label">Added</span>
              <span className="count-value" style={{ color: 'var(--colony-added)' }}>+{manualAdded}</span>
            </div>
            <div className="count-item">
              <span className="count-label">Removed</span>
              <span className="count-value" style={{ color: 'var(--colony-removed)' }}>−{manualRemoved}</span>
            </div>
            <div className="count-item final">
              <span className="count-label">Final</span>
              <span className="count-value">{finalCount}</span>
            </div>
          </div>

          {sessionId && (
            <div className="session-info">
              <span className="session-label">Session:</span>
              <span className="session-value">{sessionId.slice(0, 16)}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CountsSummary
