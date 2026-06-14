import JSZip from 'jszip'
import { PDFDocument, degrees, rgb } from 'pdf-lib'
import { StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
import type { PdfFileInfo, PdfOutput, PdfPageThumbnail, PdfProgress } from './types'
import { createFileId, getBaseName } from './fileUtils'
import * as XLSX from 'xlsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const pdfMimeType = 'application/pdf'
const zipMimeType = 'application/zip'
const pngMimeType = 'image/png'

type ProgressHandler = (progress: PdfProgress) => void

const readAsArrayBuffer = (file: File) => file.arrayBuffer()

const getPdfDocument = async (file: File): Promise<PDFDocumentProxy> => {
  const data = new Uint8Array(await readAsArrayBuffer(file))
  return pdfjsLib.getDocument({ data }).promise
}

const blobFromBytes = (bytes: Uint8Array<ArrayBufferLike>, type: string) =>
  new Blob([bytes.slice().buffer], { type })

const canvasToBlob = (canvas: HTMLCanvasElement, type = pngMimeType, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Unable to render canvas output.'))
      }
    }, type, quality)
  })

export const renderPdfPageToCanvas = async (
  document: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
) => {
  const page = await document.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = window.document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas rendering is not supported in this browser.')
  }

  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, canvasContext: context, viewport }).promise
  return canvas
}

export const loadPdfFileInfo = async (
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfFileInfo> => {
  onProgress?.({ label: `Reading ${file.name}`, value: 15 })
  const document = await getPdfDocument(file)
  const pageCount = document.numPages
  const thumbnails: PdfPageThumbnail[] = []
  const maxThumbnails = Math.min(pageCount, 24)

  for (let index = 1; index <= maxThumbnails; index += 1) {
    const canvas = await renderPdfPageToCanvas(document, index, 0.22)
    thumbnails.push({ pageNumber: index, dataUrl: canvas.toDataURL(pngMimeType) })
    onProgress?.({
      label: `Rendering preview ${index}/${maxThumbnails}`,
      value: 15 + Math.round((index / maxThumbnails) * 70),
    })
  }

  document.cleanup()
  onProgress?.({ label: 'Preview ready', value: 100 })

  return {
    id: createFileId(file),
    file,
    name: file.name,
    size: file.size,
    pageCount,
    thumbnails,
  }
}

export const mergePdfFiles = async (
  files: File[],
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const outputPdf = await PDFDocument.create()

  for (const [fileIndex, file] of files.entries()) {
    onProgress?.({ label: `Merging ${file.name}`, value: Math.round((fileIndex / files.length) * 80) })
    const inputPdf = await PDFDocument.load(await readAsArrayBuffer(file))
    const copiedPages = await outputPdf.copyPages(inputPdf, inputPdf.getPageIndices())
    copiedPages.forEach((page) => outputPdf.addPage(page))
  }

  onProgress?.({ label: 'Saving merged PDF', value: 92 })
  const bytes = await outputPdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Merged_PDF.pdf' }
}

import type { PdfFilePagesSpec } from './types'

export const mergeSelectedPages = async (
  filesWithPages: PdfFilePagesSpec[],
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const outputPdf = await PDFDocument.create()

  for (const [fileIndex, item] of filesWithPages.entries()) {
    const { file, pageIndexes, pageRotations } = item
    onProgress?.({ label: `Merging pages from ${file.name}`, value: Math.round((fileIndex / filesWithPages.length) * 80) })
    const inputPdf = await PDFDocument.load(await readAsArrayBuffer(file))
    if (!pageIndexes || pageIndexes.length === 0) continue
    const zeroBased = pageIndexes.map((p) => Math.max(0, p))
    const copiedPages = await outputPdf.copyPages(inputPdf, zeroBased)
    copiedPages.forEach((page, idx) => {
      // apply per-page rotation if provided (pageIndexes are zero-based)
      const sourceIndex = zeroBased[idx]
      const rotationDeg = pageRotations?.[sourceIndex]
      if (typeof rotationDeg === 'number' && rotationDeg % 90 === 0) {
        page.setRotation(degrees((rotationDeg + page.getRotation().angle) % 360))
      }
      outputPdf.addPage(page)
    })
  }

  onProgress?.({ label: 'Saving merged PDF', value: 92 })
  const bytes = await outputPdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Merged_PDF.pdf' }
}

export const splitPdfFile = async (
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const sourcePdf = await PDFDocument.load(await readAsArrayBuffer(file))
  const zip = new JSZip()
  const pageCount = sourcePdf.getPageCount()

  for (let index = 0; index < pageCount; index += 1) {
    onProgress?.({ label: `Splitting page ${index + 1}/${pageCount}`, value: Math.round((index / pageCount) * 90) })
    const singlePdf = await PDFDocument.create()
    const [page] = await singlePdf.copyPages(sourcePdf, [index])
    singlePdf.addPage(page)
    const bytes = await singlePdf.save({ useObjectStreams: true })
    zip.file(`${getBaseName(file.name)}-page-${index + 1}.pdf`, bytes)
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: zipMimeType })
  return { blob, fileName: 'ShreeDesk_Split_PDF.zip' }
}

export const splitPdfFileBySize = async (
  file: File,
  maxBytes: number,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const sourcePdf = await PDFDocument.load(await readAsArrayBuffer(file))
  const zip = new JSZip()
  const pageCount = sourcePdf.getPageCount()

  let chunkIndex = 0
  let start = 0
  while (start < pageCount) {
    // try to fit as many pages as possible under maxBytes, at least 1 page
    let end = start
    let bytes: Uint8Array | null = null
    while (end < pageCount) {
      const out = await PDFDocument.create()
      const pages = await out.copyPages(sourcePdf, Array.from({ length: end - start + 1 }, (_, i) => start + i))
      pages.forEach((p) => out.addPage(p))
      const candidate = await out.save({ useObjectStreams: true })
      if (candidate.byteLength > maxBytes && end > start) {
        break
      }
      bytes = candidate
      end += 1
      if (candidate.byteLength > maxBytes) break
    }
    if (!bytes) {
      // single page exceeds maxBytes, include it anyway
      const out = await PDFDocument.create()
      const [page] = await out.copyPages(sourcePdf, [start])
      out.addPage(page)
      bytes = await out.save({ useObjectStreams: true })
      end = start + 1
    }
    chunkIndex += 1
    zip.file(`${getBaseName(file.name)}-part-${chunkIndex}.pdf`, bytes)
    onProgress?.({ label: `Building part ${chunkIndex} (pages ${start + 1}-${end})`, value: Math.round((end / pageCount) * 90) })
    start = end
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: zipMimeType })
  return { blob, fileName: 'ShreeDesk_Split_PDF.zip' }
}

export const compressPdfFile = async (
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: 'Loading PDF for optimization', value: 25 })
  const pdf = await PDFDocument.load(await readAsArrayBuffer(file), { updateMetadata: false })
  onProgress?.({ label: 'Rebuilding PDF object streams', value: 65 })
  const bytes = await pdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Compressed_PDF.pdf' }
}

// Enhanced compression with presets. 'maximum'/'custom' (low %) will rasterize pages and re-embed as JPEGs
export const compressPdfFileEnhanced = async (
  file: File,
  preset: 'maximum' | 'recommended' | 'high' | 'custom',
  customQuality: number,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: 'Preparing compression', value: 10 })

  // For 'custom' below 100%, rasterize with quality + resolution scaled by the slider.
  // For 'custom' at/above 100%, keep original quality but rebuild streams (no further shrink possible).
  const shouldRasterize = preset === 'maximum' || (preset === 'custom' && customQuality < 100)

  if (shouldRasterize) {
    // map quality % -> jpeg quality and render scale for better compression at minimal visual loss
    const qFraction = preset === 'maximum'
      ? Math.max(0.05, Math.min(1, customQuality / 100))
      : Math.max(0.05, Math.min(1, customQuality / 100))

    // Render scale: lower quality settings also reduce resolution slightly to gain extra
    // compression without a large visible quality drop (most loss is perceived from JPEG artifacts,
    // not minor resolution reduction at normal viewing sizes).
    const renderScale = preset === 'maximum'
      ? 1.5
      : 1.2 + (qFraction * 0.8) // ranges ~1.24 (10%) .. 2.0 (100%)

    const jpegQuality = preset === 'maximum'
      ? qFraction
      : Math.max(0.35, qFraction) // avoid extremely low jpeg quality artifacts for custom mode

    const document = await getPdfDocument(file)
    const outPdf = await PDFDocument.create()
    const pages = document.numPages
    for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
      onProgress?.({ label: `Rasterizing page ${pageNumber}/${pages}`, value: Math.round((pageNumber / pages) * 70) })
      const canvas = await renderPdfPageToCanvas(document, pageNumber, renderScale)
      const blob = await canvasToBlob(canvas, 'image/jpeg', jpegQuality)
      const arr = new Uint8Array(await blob.arrayBuffer())
      const embedded = await outPdf.embedJpg(arr)
      // Use the canvas's pixel size divided by renderScale to recover original page dimensions in points,
      // keeping the visual size of the output PDF page consistent with the source.
      const pageWidth = embedded.width / renderScale
      const pageHeight = embedded.height / renderScale
      const page = outPdf.addPage([pageWidth, pageHeight])
      page.drawImage(embedded, { x: 0, y: 0, width: pageWidth, height: pageHeight })
    }
    document.cleanup()
    onProgress?.({ label: 'Saving compressed PDF', value: 90 })
    const bytes = await outPdf.save({ useObjectStreams: true })
    return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Compressed_PDF.pdf' }
  }

  // Fallback: simple object-stream rebuild for recommended/high/custom>=100%
  onProgress?.({ label: 'Loading PDF for optimization', value: 25 })
  const pdf = await PDFDocument.load(await readAsArrayBuffer(file), { updateMetadata: false })
  onProgress?.({ label: 'Rebuilding PDF object streams', value: 65 })
  const bytes = await pdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Compressed_PDF.pdf' }
}

export const organizePdfFile = async (
  file: File,
  // pages may include -1 to indicate a blank page; non-negative values are zero-based indexes
  pageIndexes: number[],
  pageRotations?: Record<number, number>,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  if (!pageIndexes || pageIndexes.length === 0) throw new Error('Provide at least one page for organization.')
  const sourcePdf = await PDFDocument.load(await readAsArrayBuffer(file))
  const outputPdf = await PDFDocument.create()
  for (let i = 0; i < pageIndexes.length; i += 1) {
    const idx = pageIndexes[i]
    onProgress?.({ label: `Processing page ${i + 1}/${pageIndexes.length}`, value: Math.round((i / pageIndexes.length) * 80) })
    if (idx === -1) {
      // insert blank A4 page
      outputPdf.addPage([595, 842])
    } else if (idx >= 0) {
      const [copied] = await outputPdf.copyPages(sourcePdf, [idx])
      const rotationDeg = pageRotations?.[idx]
      if (typeof rotationDeg === 'number' && rotationDeg % 90 === 0) {
        copied.setRotation(degrees((rotationDeg + copied.getRotation().angle) % 360))
      }
      outputPdf.addPage(copied)
    }
  }
  const bytes = await outputPdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Organized_PDF.pdf' }
}

export const splitPdfFileWithOptions = async (
  file: File,
  options: { mode: 'every' | 'chunks' | 'ranges'; chunkSize?: number; ranges?: Array<[number, number]> },
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const sourcePdf = await PDFDocument.load(await readAsArrayBuffer(file))
  const zip = new JSZip()
  const pageCount = sourcePdf.getPageCount()

  if (options.mode === 'every') {
    for (let index = 0; index < pageCount; index += 1) {
      onProgress?.({ label: `Splitting page ${index + 1}/${pageCount}`, value: Math.round((index / pageCount) * 90) })
      const singlePdf = await PDFDocument.create()
      const [page] = await singlePdf.copyPages(sourcePdf, [index])
      singlePdf.addPage(page)
      const bytes = await singlePdf.save({ useObjectStreams: true })
      zip.file(`${getBaseName(file.name)}-page-${index + 1}.pdf`, bytes)
    }
  } else if (options.mode === 'chunks') {
    const size = options.chunkSize ?? 1
    let chunkIndex = 0
    for (let start = 0; start < pageCount; start += size) {
      const end = Math.min(pageCount, start + size)
      const out = await PDFDocument.create()
      const pages = await out.copyPages(sourcePdf, Array.from({ length: end - start }, (_, i) => start + i))
      pages.forEach((p) => out.addPage(p))
      const bytes = await out.save({ useObjectStreams: true })
      chunkIndex += 1
      zip.file(`${getBaseName(file.name)}-chunk-${chunkIndex}.pdf`, bytes)
    }
  } else if (options.mode === 'ranges' && options.ranges) {
    let idx = 0
    for (const [start, end] of options.ranges) {
      const s = Math.max(0, start)
      const e = Math.min(pageCount - 1, end)
      const out = await PDFDocument.create()
      const pages = await out.copyPages(sourcePdf, Array.from({ length: e - s + 1 }, (_, i) => s + i))
      pages.forEach((p) => out.addPage(p))
      const bytes = await out.save({ useObjectStreams: true })
      idx += 1
      zip.file(`${getBaseName(file.name)}-range-${idx}.pdf`, bytes)
    }
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: zipMimeType })
  return { blob, fileName: 'ShreeDesk_Split_PDF.zip' }
}

export const rotatePdfFile = async (
  file: File,
  pageIndexes: number[],
  rotationDegrees: number,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const pdf = await PDFDocument.load(await readAsArrayBuffer(file))
  const pages = pdf.getPages()
  const pageSet = new Set(pageIndexes)

  pages.forEach((page, index) => {
    if (pageSet.has(index)) {
      const currentAngle = page.getRotation().angle
      page.setRotation(degrees((currentAngle + rotationDegrees) % 360))
    }
    onProgress?.({ label: `Rotating page ${index + 1}/${pages.length}`, value: Math.round(((index + 1) / pages.length) * 85) })
  })

  const bytes = await pdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Rotated_PDF.pdf' }
}

export const reorderPdfPages = async (
  file: File,
  pageIndexes: number[],
  pageRotations?: Record<number, number>,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  if (pageIndexes.length === 0) {
    throw new Error('Provide at least one page number for the new order.')
  }

  const sourcePdf = await PDFDocument.load(await readAsArrayBuffer(file))
  onProgress?.({ label: 'Reordering selected pages', value: 55 })
  const outputPdf = await PDFDocument.create()
  const copiedPages = await outputPdf.copyPages(sourcePdf, pageIndexes)
  copiedPages.forEach((page, idx) => {
    const srcIndex = pageIndexes[idx]
    const rotationDeg = pageRotations?.[srcIndex]
    if (typeof rotationDeg === 'number' && rotationDeg % 90 === 0) {
      page.setRotation(degrees((rotationDeg + page.getRotation().angle) % 360))
    }
    outputPdf.addPage(page)
  })
  const bytes = await outputPdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Organized_PDF.pdf' }
}

export const deletePdfPages = async (
  file: File,
  pageIndexes: number[],
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const sourcePdf = await PDFDocument.load(await readAsArrayBuffer(file))
  const deleteSet = new Set(pageIndexes)
  const keepIndexes = sourcePdf.getPageIndices().filter((index) => !deleteSet.has(index))

  if (keepIndexes.length === 0) {
    throw new Error('At least one page must remain after deletion.')
  }

  onProgress?.({ label: 'Copying remaining pages', value: 55 })
  const outputPdf = await PDFDocument.create()
  const copiedPages = await outputPdf.copyPages(sourcePdf, keepIndexes)
  copiedPages.forEach((page) => outputPdf.addPage(page))
  const bytes = await outputPdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Deleted_Pages.pdf' }
}

export const extractPdfPages = async (
  file: File,
  pageIndexes: number[],
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  if (pageIndexes.length === 0) {
    throw new Error('Select at least one page to extract.')
  }

  const sourcePdf = await PDFDocument.load(await readAsArrayBuffer(file))
  onProgress?.({ label: 'Extracting selected pages', value: 55 })
  const outputPdf = await PDFDocument.create()
  const copiedPages = await outputPdf.copyPages(sourcePdf, pageIndexes)
  copiedPages.forEach((page) => outputPdf.addPage(page))
  const bytes = await outputPdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Extracted_Pages.pdf' }
}



export const imagesToPdf = async (
  files: File[],
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const pdf = await PDFDocument.create()

  for (const [index, file] of files.entries()) {
    onProgress?.({ label: `Adding image ${index + 1}/${files.length}`, value: Math.round((index / files.length) * 80) })
    const bytes = new Uint8Array(await readAsArrayBuffer(file))
    const image = file.type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
    const page = pdf.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }

  const bytes = await pdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Image_To_PDF.pdf' }
}

import type { ImageFormat } from './types'

export const pdfToImages = async (
  file: File,
  format: ImageFormat = 'png',
  quality = 0.92,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const document = await getPdfDocument(file)
  const zip = new JSZip()
  const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg'

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onProgress?.({ label: `Rendering page ${pageNumber}/${document.numPages}`, value: Math.round((pageNumber / document.numPages) * 85) })
    const canvas = await renderPdfPageToCanvas(document, pageNumber, 2)
    const blob = await canvasToBlob(canvas, mime, format === 'png' ? undefined : quality)
    const ext = format === 'jpeg' ? 'jpg' : format
    zip.file(`${getBaseName(file.name)}-page-${pageNumber}.${ext}`, blob)
  }

  document.cleanup()
  const blob = await zip.generateAsync({ type: 'blob', mimeType: zipMimeType })
  return { blob, fileName: 'ShreeDesk_PDF_To_Images.zip' }
}

export const convertWordToPdf = async (
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: `Loading ${file.name}`, value: 10 })
  const name = file.name.toLowerCase()
  const buffer = await readAsArrayBuffer(file)
  // Basic support: convert plain text and simple RTF to a single-page PDF
  if (file.type === 'text/plain' || name.endsWith('.txt') || name.endsWith('.rtf')) {
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([595, 842]) // A4-ish
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const text = new TextDecoder().decode(new Uint8Array(buffer))
    const lines = text.split(/\r?\n/)
    const fontSize = 12
    const margin = 40
    let y = page.getHeight() - margin
    for (const line of lines) {
      if (y < margin + fontSize) {
        y = page.getHeight() - margin
        page = pdfDoc.addPage([595, 842])
      }
      page.drawText(line, { x: margin, y: y - fontSize, size: fontSize, font })
      y -= fontSize + 4
    }

    onProgress?.({ label: 'Generating PDF', value: 70 })
    const bytes = await pdfDoc.save({ useObjectStreams: true })
    return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Word_To_PDF.pdf' }
  }

  // For DOC/DOCX we currently cannot guarantee fidelity in-browser
  throw new Error('DOC/DOCX conversion requires a server-side converter. Please upload to a server endpoint or use TXT/RTF for client-side conversion.')
}

export const watermarkPdfFile = async (
  file: File,
  text: string,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: 'Loading PDF for watermarking', value: 20 })
  const pdfDoc = await PDFDocument.load(await readAsArrayBuffer(file))
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  onProgress?.({ label: 'Applying watermark to pages', value: 50 })
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const { width, height } = page.getSize()
    
    // Draw text diagonally in the center of the page
    page.drawText(text, {
      x: width / 2 - 150,
      y: height / 2 - 50,
      size: 48,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.2,
      rotate: degrees(45),
    })
  }

  onProgress?.({ label: 'Saving watermarked PDF', value: 85 })
  const bytes = await pdfDoc.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Watermarked.pdf' }
}

export const addPageNumbersToPdf = async (
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: 'Loading PDF for pagination', value: 20 })
  const pdfDoc = await PDFDocument.load(await readAsArrayBuffer(file))
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  onProgress?.({ label: 'Stamping page numbers', value: 50 })
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const { width } = page.getSize()
    const pageNumText = `Page ${i + 1} of ${pages.length}`
    const textWidth = font.widthOfTextAtSize(pageNumText, 10)
    
    page.drawText(pageNumText, {
      x: width / 2 - textWidth / 2,
      y: 25,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
  }

  onProgress?.({ label: 'Saving paginated PDF', value: 85 })
  const bytes = await pdfDoc.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'ShreeDesk_Paginated.pdf' }
}

export const protectPdfFile = async (
  file: File,
  password: string,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: 'Encrypting PDF security layers', value: 30 })
  const buffer = await readAsArrayBuffer(file)
  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    buffer
  )

  const envelope = new Uint8Array(16 + 12 + encrypted.byteLength)
  envelope.set(salt, 0)
  envelope.set(iv, 16)
  envelope.set(new Uint8Array(encrypted), 28)

  onProgress?.({ label: 'Saving encrypted document', value: 90 })
  return {
    blob: blobFromBytes(envelope, pdfMimeType),
    fileName: `ShreeDesk_Protected_${file.name}`
  }
}

export const unlockPdfFile = async (
  file: File,
  password: string,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: 'Decrypting PDF security layers', value: 30 })
  const envelopeBytes = new Uint8Array(await readAsArrayBuffer(file))
  
  try {
    const salt = envelopeBytes.slice(0, 16)
    const iv = envelopeBytes.slice(16, 28)
    const encrypted = envelopeBytes.slice(28)

    const encoder = new TextEncoder()
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    )

    onProgress?.({ label: 'Document decrypted successfully', value: 90 })
    return {
      blob: blobFromBytes(new Uint8Array(decrypted), pdfMimeType),
      fileName: file.name.replace('ShreeDesk_Protected_', '')
    }
  } catch (e) {
    throw new Error('Invalid password. Failed to decrypt PDF.')
  }
}

export const extractImagesFromPdf = async (
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: 'Loading PDF for image asset scan', value: 15 })
  const document = await getPdfDocument(file)
  const pageCount = document.numPages
  const zip = new JSZip()
  let imageCount = 0

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.({ label: `Scanning page ${i}/${pageCount} for images`, value: 15 + Math.round((i / pageCount) * 75) })
    const page = await document.getPage(i)
    const ops = await page.getOperatorList()
    const { fnArray, argsArray } = ops
    
    for (let j = 0; j < fnArray.length; j++) {
      const op = fnArray[j]
      if (op === 85 || op === 82 || op === 86) {
        const imgName = argsArray[j][0]
        try {
          const img = await new Promise<any>((resolve) => {
            page.objs.get(imgName, (obj: any) => resolve(obj))
          })
          if (img && img.width && img.height) {
            imageCount++
            const canvas = window.document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (ctx) {
              const imgData = ctx.createImageData(img.width, img.height)
              if (img.data) {
                const dataLen = img.data.length
                const target = imgData.data
                if (dataLen === img.width * img.height * 4) {
                  target.set(img.data)
                } else {
                  let srcIdx = 0
                  let destIdx = 0
                  while (srcIdx < dataLen) {
                    target[destIdx] = img.data[srcIdx]
                    target[destIdx + 1] = img.data[srcIdx + 1]
                    target[destIdx + 2] = img.data[srcIdx + 2]
                    target[destIdx + 3] = 255
                    srcIdx += 3
                    destIdx += 4
                  }
                }
                ctx.putImageData(imgData, 0, 0)
                const blob = await canvasToBlob(canvas, 'image/png')
                zip.file(`extracted_img_${imageCount}.png`, blob)
              }
            }
          }
        } catch (e) {
          console.warn('Failed to extract image object', imgName, e)
        }
      }
    }
  }

  document.cleanup()

  if (imageCount === 0) {
    onProgress?.({ label: 'No raw image assets found, saving pages as images', value: 90 })
    const document2 = await getPdfDocument(file)
    for (let i = 1; i <= pageCount; i++) {
      const pageCanvas = await renderPdfPageToCanvas(document2, i, 1.5)
      const blob = await canvasToBlob(pageCanvas, 'image/png')
      zip.file(`page_${i}.png`, blob)
    }
    document2.cleanup()
  }

  const blob = await zip.generateAsync({ type: 'blob', mimeType: zipMimeType })
  return { blob, fileName: 'ShreeDesk_Extracted_Images.zip' }
}

export const extractTextFromPdf = async (
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: 'Loading PDF for text extraction', value: 15 })
  const document = await getPdfDocument(file)
  const pageCount = document.numPages
  let fullText = ''

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.({ label: `Reading text from page ${i}/${pageCount}`, value: 15 + Math.round((i / pageCount) * 75) })
    const page = await document.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item: any) => item.str).join(' ')
    fullText += `--- Page ${i} ---\n${pageText}\n\n`
  }

  document.cleanup()
  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' })
  return { blob, fileName: 'ShreeDesk_Extracted_Text.txt' }
}

export const convertExcelToPdf = async (
  file: File,
  onProgress: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress({ label: 'Reading Excel sheet data...', value: 20 })
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
  
  onProgress({ label: 'Generating PDF sheets...', value: 50 })
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const fontSize = 9
  const rowHeight = 16
  const margin = 40
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false })
    if (rows.length === 0) continue
    
    let page = pdfDoc.addPage([595.276, 841.890]) // A4 Size
    const { width, height } = page.getSize()
    let y = height - margin
    
    // Draw sheet title
    page.drawText(`Sheet: ${sheetName}`, { x: margin, y, size: 12, font: fontBold, color: rgb(0.12, 0.45, 0.22) })
    y -= 24
    
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx] as any[]
      if (y < margin + 40) {
        page = pdfDoc.addPage([595.276, 841.890])
        y = height - margin
      }
      
      let x = margin
      const colWidth = (width - margin * 2) / Math.max(5, row.length)
      
      for (let cIdx = 0; cIdx < row.length; cIdx++) {
        const val = String(row[cIdx] ?? '')
        if (x + colWidth > width - margin) break
        
        page.drawText(val.substring(0, 15), {
          x: x,
          y: y,
          size: fontSize,
          font: rIdx === 0 ? fontBold : font,
          color: rIdx === 0 ? rgb(0.1, 0.1, 0.1) : rgb(0.25, 0.25, 0.25)
        })
        
        page.drawRectangle({
          x: x - 4,
          y: y - 4,
          width: colWidth,
          height: rowHeight,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.5
        })
        
        x += colWidth
      }
      y -= rowHeight
    }
  }
  
  onProgress({ label: 'Finalizing PDF output...', value: 90 })
  const pdfBytes = await pdfDoc.save()
  const name = getBaseName(file.name) + '_converted.pdf'
  return {
    fileName: name,
    blob: new Blob([pdfBytes as any], { type: 'application/pdf' })
  }
}

export const convertPdfToExcel = async (
  file: File,
  onProgress: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress({ label: 'Loading PDF document...', value: 20 })
  const typedarray = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise
  
  const workbook = XLSX.utils.book_new()
  const maxPages = Math.min(pdf.numPages, 10)
  
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    onProgress({ label: `Parsing tables on page ${pageNum}...`, value: 20 + Math.round((pageNum / maxPages) * 60) })
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    
    const items = textContent.items as any[]
    const rowMap: Record<number, any[]> = {}
    
    items.forEach((item) => {
      const y = Math.round(item.transform[5] * 2) / 2
      if (!rowMap[y]) {
        rowMap[y] = []
      }
      rowMap[y].push(item)
    })
    
    const sortedY = Object.keys(rowMap).map(Number).sort((a, b) => b - a)
    const sheetData: string[][] = []
    
    sortedY.forEach((y) => {
      const rowItems = rowMap[y]
      rowItems.sort((a, b) => a.transform[4] - b.transform[4])
      const rowText = rowItems.map((item) => item.str.trim()).filter(Boolean)
      if (rowText.length > 0) {
        sheetData.push(rowText)
      }
    })
    
    if (sheetData.length > 0) {
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
      XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${pageNum}`)
    }
  }
  
  onProgress({ label: 'Writing Excel workbook...', value: 90 })
  const wopts: XLSX.WritingOptions = { bookType: 'xlsx', bookSST: false, type: 'array' }
  const warray = XLSX.write(workbook, wopts)
  
  const name = getBaseName(file.name) + '_converted.xlsx'
  return {
    fileName: name,
    blob: new Blob([warray as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }
}

