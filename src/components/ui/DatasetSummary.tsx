import { useMemo } from 'react'

export interface DatasetSummaryProps {
  headers: string[]
  rows: string[][]
}

interface ColumnStat {
  name: string
  missing: number
  missingPct: number
}

/**
 * Lightweight analytics summary for a tabular dataset: row/column counts,
 * per-column missing-value rates, and duplicate-row detection.
 * Pure client-side computation — no external dependencies.
 */
export const DatasetSummary = ({ headers, rows }: DatasetSummaryProps) => {
  const stats = useMemo(() => {
    const rowCount = rows.length
    const colCount = headers.length

    const columnStats: ColumnStat[] = headers.map((name, colIndex) => {
      let missing = 0
      for (const row of rows) {
        const value = row[colIndex]
        if (value === undefined || value === null || String(value).trim() === '') missing += 1
      }
      return {
        name: name || `Column ${colIndex + 1}`,
        missing,
        missingPct: rowCount === 0 ? 0 : (missing / rowCount) * 100,
      }
    })

    const seen = new Set<string>()
    let duplicateRows = 0
    for (const row of rows) {
      const key = JSON.stringify(row)
      if (seen.has(key)) duplicateRows += 1
      else seen.add(key)
    }

    const totalMissing = columnStats.reduce((sum, c) => sum + c.missing, 0)
    const totalCells = rowCount * colCount
    const completeness = totalCells === 0 ? 100 : ((totalCells - totalMissing) / totalCells) * 100

    return { rowCount, colCount, columnStats, duplicateRows, completeness }
  }, [headers, rows])

  if (stats.rowCount === 0 || stats.colCount === 0) return null

  const flaggedColumns = stats.columnStats.filter((c) => c.missing > 0).sort((a, b) => b.missing - a.missing)

  return (
    <div className="dataset-summary">
      <div className="tool-summary">
        <div className="summary-card">
          <span className="summary-label">Rows</span>
          <strong>{stats.rowCount.toLocaleString()}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Columns</span>
          <strong>{stats.colCount.toLocaleString()}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Duplicate rows</span>
          <strong style={{ color: stats.duplicateRows > 0 ? 'var(--warning)' : 'var(--text)' }}>
            {stats.duplicateRows.toLocaleString()}
          </strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Data completeness</span>
          <strong style={{ color: stats.completeness < 95 ? 'var(--warning)' : 'var(--success)' }}>
            {stats.completeness.toFixed(1)}%
          </strong>
        </div>
      </div>

      {flaggedColumns.length > 0 && (
        <div className="dataset-summary-flags">
          <h4 className="dataset-summary-flags-title">Columns with missing values</h4>
          <ul className="dataset-summary-flags-list">
            {flaggedColumns.slice(0, 8).map((col) => (
              <li key={col.name} className="dataset-summary-flag-item">
                <span className="dataset-summary-flag-name">{col.name}</span>
                <span className="dataset-summary-flag-bar-track">
                  <span
                    className="dataset-summary-flag-bar-fill"
                    style={{ width: `${Math.min(100, col.missingPct)}%` }}
                  />
                </span>
                <span className="dataset-summary-flag-value">
                  {col.missing.toLocaleString()} ({col.missingPct.toFixed(1)}%)
                </span>
              </li>
            ))}
          </ul>
          {flaggedColumns.length > 8 && (
            <p className="dataset-summary-flags-more">
              +{flaggedColumns.length - 8} more column{flaggedColumns.length - 8 === 1 ? '' : 's'} with missing values
            </p>
          )}
        </div>
      )}
    </div>
  )
}
