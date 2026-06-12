import type { PdfProgress } from '../../tools/pdf/engine/types'

interface PdfProgressBarProps {
  progress: PdfProgress | null
}

const PdfProgressBar = ({ progress }: PdfProgressBarProps) => {
  if (!progress) return null

  return (
    <div className="pdf-progress" aria-live="polite">
      <div className="pdf-progress-top">
        <span>{progress.label}</span>
        <strong>{progress.value}%</strong>
      </div>
      <div className="pdf-progress-track">
        <span style={{ width: `${progress.value}%` }} />
      </div>
    </div>
  )
}

export default PdfProgressBar
