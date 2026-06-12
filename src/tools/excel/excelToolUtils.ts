import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export const supportedExcelExtensions = ['xlsx', 'xlsm', 'xlsb', 'xls']
export const supportedCsvExtensions = ['csv']
export const supportedFileExtensions = [...supportedExcelExtensions, ...supportedCsvExtensions]

export const getFileExtension = (file: File) => file.name.split('.').pop()?.toLowerCase() ?? ''
export const getFileBaseName = (file: File) => file.name.replace(/\.[^/.]+$/, '')

export const normalizeRow = (row: any[]) =>
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

  if (ext === 'csv') {
    const content = await readFileAsText(file)
    return XLSX.read(content, { type: 'string' })
  }

  const data = await readFileAsArrayBuffer(file)
  return XLSX.read(data, { type: 'array' })
}

export const parseWorksheetRows = (sheet: XLSX.WorkSheet) =>
  XLSX.utils
    .sheet_to_json<string[]>(sheet, { header: 1, raw: false })
    .map((row) => normalizeRow(row))
    .filter((row) => row.some((cell) => cell !== ''))

export const parseCsvRows = async (file: File) =>
  new Promise<string[][]>((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result: any) => {
        const rows = result.data.map((row: any) => normalizeRow(row))
        resolve(rows)
      },
      error: (error: any) => reject(error),
    })
  })

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
