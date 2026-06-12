import JSZip from 'jszip'
import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
import type { PdfFileInfo, PdfOutput, PdfPageThumbnail, PdfProgress } from './types'
import { createFileId, getBaseName } from './fileUtils'

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

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Unable to render canvas output.'))
      }
    }, pngMimeType)
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
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'merged-document.pdf' }
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
  return { blob, fileName: `${getBaseName(file.name)}-split-pages.zip` }
}

export const compressPdfFile = async (
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  onProgress?.({ label: 'Loading PDF for optimization', value: 25 })
  const pdf = await PDFDocument.load(await readAsArrayBuffer(file), { updateMetadata: false })
  onProgress?.({ label: 'Rebuilding PDF object streams', value: 65 })
  const bytes = await pdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: `${getBaseName(file.name)}-compressed.pdf` }
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
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: `${getBaseName(file.name)}-rotated.pdf` }
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
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: `${getBaseName(file.name)}-pages-deleted.pdf` }
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
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: `${getBaseName(file.name)}-extracted-pages.pdf` }
}

export const reorderPdfPages = async (
  file: File,
  pageIndexes: number[],
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  if (pageIndexes.length === 0) {
    throw new Error('Provide at least one page number for the new order.')
  }

  const sourcePdf = await PDFDocument.load(await readAsArrayBuffer(file))
  onProgress?.({ label: 'Reordering selected pages', value: 55 })
  const outputPdf = await PDFDocument.create()
  const copiedPages = await outputPdf.copyPages(sourcePdf, pageIndexes)
  copiedPages.forEach((page) => outputPdf.addPage(page))
  const bytes = await outputPdf.save({ useObjectStreams: true })
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: `${getBaseName(file.name)}-reordered.pdf` }
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
  return { blob: blobFromBytes(bytes, pdfMimeType), fileName: 'images-document.pdf' }
}

export const pdfToImages = async (
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfOutput> => {
  const document = await getPdfDocument(file)
  const zip = new JSZip()

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onProgress?.({ label: `Rendering page ${pageNumber}/${document.numPages}`, value: Math.round((pageNumber / document.numPages) * 85) })
    const canvas = await renderPdfPageToCanvas(document, pageNumber, 2)
    const blob = await canvasToBlob(canvas)
    zip.file(`${getBaseName(file.name)}-page-${pageNumber}.png`, blob)
  }

  document.cleanup()
  const blob = await zip.generateAsync({ type: 'blob', mimeType: zipMimeType })
  return { blob, fileName: `${getBaseName(file.name)}-images.zip` }
}
