export type PdfToolId =
  | 'merge'
  | 'split'
  | 'compress'
  | 'rotate'
  | 'delete'
  | 'extract'
  | 'reorder'
  | 'imageToPdf'
  | 'pdfToImage'

export type PdfToolMode = 'pdf' | 'image'

export interface PdfPageThumbnail {
  pageNumber: number
  dataUrl: string
}

export interface PdfFileInfo {
  id: string
  file: File
  name: string
  size: number
  pageCount: number
  thumbnails: PdfPageThumbnail[]
}

export interface PdfProgress {
  label: string
  value: number
}

export interface PdfToolDefinition {
  id: PdfToolId
  title: string
  description: string
  icon: string
  mode: PdfToolMode
  acceptsMultiple: boolean
  outputLabel: string
}

export interface PdfOutput {
  blob: Blob
  fileName: string
}
