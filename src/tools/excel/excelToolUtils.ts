import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export const supportedExcelExtensions = ['xlsx', 'xlsm', 'xlsb', 'xls']
export const supportedCsvExtensions = ['csv', 'tsv']
export const supportedFileExtensions = [...supportedExcelExtensions, ...supportedCsvExtensions]

export const getFileExtension = (file: File) => file.name.split('.').pop()?.toLowerCase() ?? ''
export const getFileBaseName = (file: File) => file.name.replace(/\.[^/.]+$/, '')

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

export const normalizeRow = (row: unknown[]) =>
  row.map((cell) => (cell === undefined || cell === null ? '' : String(cell).trim()))

export const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })

export const readFileAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })

export const readWorkbookFromFile = async (file: File): Promise<XLSX.WorkBook> => {
  const ext = getFileExtension(file)

  if (supportedCsvExtensions.includes(ext)) {
    const content = await readFileAsText(file)
    return XLSX.read(content, { type: 'string', FS: ext === 'tsv' ? '\t' : ',' })
  }

  const data = await readFileAsArrayBuffer(file)
  return XLSX.read(data, { type: 'array' })
}

export const parseWorksheetRows = (sheet: XLSX.WorkSheet) =>
  XLSX.utils
    .sheet_to_json<unknown[]>(sheet, { header: 1, raw: false })
    .map((row) => normalizeRow(row))
    .filter((row) => row.some((cell) => cell !== ''))

export const parseCsvRows = async (file: File) => {
  const ext = getFileExtension(file)
  const delimiter = ext === 'tsv' ? '\t' : undefined

  return new Promise<string[][]>((resolve, reject) => {
    Papa.parse<string[]>(file, {
      delimiter,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data.map((row) => normalizeRow(row))
        resolve(rows)
      },
      error: (error) => reject(error),
    })
  })
}

export const getHeaderRowIndex = (rows: string[][]) => {
  if (rows.length === 0) return -1

  let bestIndex = 0
  let bestScore = -1
  rows.slice(0, 25).forEach((row, index) => {
    const nonEmptyCells = row.filter((cell) => cell !== '').length
    const uniqueCells = new Set(row.filter((cell) => cell !== '').map((cell) => cell.toLowerCase())).size
    const score = nonEmptyCells + uniqueCells
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return bestIndex
}

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const exportWorkbook = (workbook: XLSX.WorkBook, fileName: string) => {
  const workbookBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([workbookBinary], { type: 'application/octet-stream' })
  downloadBlob(blob, fileName)
}

export const exportCsv = (csv: string, fileName: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, fileName)
}
