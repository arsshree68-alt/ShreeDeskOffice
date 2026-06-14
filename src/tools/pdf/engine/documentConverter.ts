import type { PdfOutput, PdfProgress } from './types'

export const convertDocxWithServer = async (
  serverUrl: string,
  file: File,
  onProgress?: (p: PdfProgress) => void,
): Promise<PdfOutput> => {
  if (!serverUrl) throw new Error('Document converter server URL not configured.')
  const url = serverUrl.endsWith('/') ? `${serverUrl}convert` : `${serverUrl}/convert`
  const form = new FormData()
  form.append('file', file)
  // optimistic progress
  onProgress?.({ label: 'Uploading document to converter', value: 10 })
  const resp = await fetch(url, { method: 'POST', body: form })
  if (!resp.ok) {
    throw new Error(`Converter server returned ${resp.status}: ${resp.statusText}`)
  }
  onProgress?.({ label: 'Downloading converted PDF', value: 80 })
  const blob = await resp.blob()
  // server should return application/pdf
  const fileName = file.name.replace(/\.[^/.]+$/, '') + '.pdf'
  onProgress?.({ label: 'Conversion complete', value: 100 })
  return { blob, fileName }
}
