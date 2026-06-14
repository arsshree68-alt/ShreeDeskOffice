export const createCanvasFromImage = async (file: File) => {
  return new Promise<{ element: HTMLImageElement; canvas: HTMLCanvasElement }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve({ element: img, canvas })
    }
    img.onerror = () => {
      console.warn('Failed to load image')
      reject(new Error('Unable to load image'))
    }
    img.src = url
  })
}
