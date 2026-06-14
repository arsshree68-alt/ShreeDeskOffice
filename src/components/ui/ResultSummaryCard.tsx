import { createDownload, formatFileSize } from '../../tools/pdf/engine/fileUtils'

interface ResultSummaryCardProps {
  inputSize: number
  outputSize: number
  filesProcessed?: number
  timeTakenMs?: number
  outputBlob: Blob
  outputFileName: string
  onStartNew?: () => void
  onReuseFiles?: () => void
}

const ResultSummaryCard = ({
  inputSize,
  outputSize,
  filesProcessed = 1,
  timeTakenMs,
  outputBlob,
  outputFileName,
  onStartNew,
  onReuseFiles,
}: ResultSummaryCardProps) => {
  const reduction = inputSize > 0 ? Math.round((1 - outputSize / inputSize) * 100) : 0
  const isSmaller = outputSize < inputSize

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
      border: '1.5px solid #86efac',
      borderRadius: '16px',
      padding: '1.5rem',
    }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        Task Completed Successfully
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { label: 'Files Processed', value: String(filesProcessed) },
          { label: 'Input Size', value: formatFileSize(inputSize) },
          { label: 'Output Size', value: formatFileSize(outputSize) },
          { label: isSmaller ? 'Size Reduction' : 'Size Change', value: isSmaller ? `${reduction}%` : '—' },
          ...(timeTakenMs ? [{ label: 'Time Taken', value: `${(timeTakenMs / 1000).toFixed(1)}s` }] : []),
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', fontSize: '0.8rem' }}>
            <div style={{ color: '#6b7280', marginBottom: '0.15rem' }}>{label}</div>
            <div style={{ fontWeight: 700, color: '#166534' }}>{value}</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => createDownload(outputBlob, outputFileName)}
        style={{ width: '100%', padding: '0.8rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', marginBottom: '0.75rem' }}
      >
        ⬇ Download File
      </button>

      {(onStartNew || onReuseFiles) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {onStartNew && (
            <button type="button" onClick={onStartNew} style={{ padding: '0.6rem', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', fontSize: '0.8rem' }}>
              ✦ Start New Task
            </button>
          )}
          {onReuseFiles && (
            <button type="button" onClick={onReuseFiles} style={{ padding: '0.6rem', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', fontSize: '0.8rem' }}>
              ↺ Reuse Files
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ResultSummaryCard
