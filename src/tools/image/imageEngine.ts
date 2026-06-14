import { createCanvasFromImage } from './imageUtils'
import type { PdfProgress } from '../pdf/engine/types'

type ProgressHandler = (p: PdfProgress) => void

export const compressImage = async (
  file: File,
  preset: 'maximum' | 'recommended' | 'high' | 'custom',
  quality = 0.8,
  onProgress?: ProgressHandler,
): Promise<{ blob: Blob; fileName: string }> => {
  onProgress?.({ label: `Loading ${file.name}`, value: 10 })
  const img = await createCanvasFromImage(file)
  onProgress?.({ label: 'Re-encoding image', value: 50 })
  // map presets to quality
  let q = quality
  if (preset === 'maximum') q = 0.25
  if (preset === 'recommended') q = 0.75
  if (preset === 'high') q = 0.95
  const blob = await new Promise<Blob | null>((resolve) => img.canvas.toBlob(resolve as any, 'image/jpeg', q))
  if (!blob) throw new Error('Unable to compress image')
  return { blob, fileName: file.name.replace(/\.[^/.]+$/, '') + '.jpg' }
}

export const resizeImage = async (
  file: File,
  width?: number,
  height?: number,
  onProgress?: ProgressHandler,
): Promise<{ blob: Blob; fileName: string }> => {
  onProgress?.({ label: `Loading ${file.name}`, value: 10 })
  const img = await createCanvasFromImage(file)
  const targetW = width ?? Math.round((height! / img.element.height) * img.element.width)
  const targetH = height ?? Math.round((width! / img.element.width) * img.element.height)
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img.element, 0, 0, targetW, targetH)
  onProgress?.({ label: 'Encoding resized image', value: 80 })
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve as any, file.type || 'image/png'))
  if (!blob) throw new Error('Unable to resize image')
  return { blob, fileName: file.name }
}

export const convertImageFormat = async (
  file: File,
  format: 'png' | 'jpeg' | 'webp' | 'avif',
  quality = 0.9,
  onProgress?: ProgressHandler,
): Promise<{ blob: Blob; fileName: string }> => {
  onProgress?.({ label: `Loading ${file.name}`, value: 10 })
  const img = await createCanvasFromImage(file)
  onProgress?.({ label: 'Converting format', value: 60 })
  const mime = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/avif'
  const blob = await new Promise<Blob | null>((resolve) => img.canvas.toBlob(resolve as any, mime, quality))
  if (!blob) throw new Error('Unable to convert image format')
  const ext = format === 'jpeg' ? 'jpg' : format
  return { blob, fileName: file.name.replace(/\.[^/.]+$/, '') + `.${ext}` }
}

export const applyFilter = async (
  file: File,
  filterStr: string,
  onProgress?: ProgressHandler,
): Promise<{ blob: Blob; fileName: string }> => {
  onProgress?.({ label: `Loading ${file.name}`, value: 10 })
  const img = await createCanvasFromImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.element.width
  canvas.height = img.element.height
  const ctx = canvas.getContext('2d')!
  
  // Apply filter
  ctx.filter = filterStr
  ctx.drawImage(img.element, 0, 0)
  
  onProgress?.({ label: 'Applying filter', value: 80 })
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve as any, file.type || 'image/png'))
  if (!blob) throw new Error('Unable to apply filter')
  return { blob, fileName: file.name }
}

export const cropImage = async (
  file: File,
  x: number,
  y: number,
  width: number,
  height: number,
  onProgress?: ProgressHandler,
): Promise<{ blob: Blob; fileName: string }> => {
  onProgress?.({ label: `Loading ${file.name}`, value: 10 })
  const img = await createCanvasFromImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img.element, x, y, width, height, 0, 0, width, height)
  
  onProgress?.({ label: 'Cropping image', value: 80 })
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve as any, file.type || 'image/png'))
  if (!blob) throw new Error('Unable to crop image')
  return { blob, fileName: file.name }
}
