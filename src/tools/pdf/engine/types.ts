export type PdfToolId =
  | 'merge'
  | 'split'
  | 'compress'
  | 'rotate'
  | 'delete'
  | 'extract'
  | 'reorder'
  | 'organize'
  | 'imageToPdf'
  | 'pdfToImage'
  | 'wordToPdf'

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

export type ImageFormat = 'png' | 'jpeg' | 'webp'

export interface PdfFilePagesSpec {
  file: File
  // zero-based page indexes
  pageIndexes: number[]
  // optional per-page rotation in degrees (0,90,180,270)
  pageRotations?: Record<number, number>
}
