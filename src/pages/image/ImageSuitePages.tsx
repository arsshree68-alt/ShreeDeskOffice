import { useState, useRef } from 'react'
import ToolPageShell from '../../components/ui/ToolPageShell'
import { FiImage, FiDownload } from 'react-icons/fi'
import { useRecentFiles } from '../../hooks/useRecentFiles'
import { formatFileSize } from '../../tools/pdf/engine/fileUtils'

type ImageTab = 'compress' | 'resize' | 'passport' | 'signature' | 'scanner'

const ImageSuitePages = () => {
  const [activeTab, setActiveTab] = useState<ImageTab>('compress')
  const { addRecentFile } = useRecentFiles()

  // Common File States
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [processedPreview, setProcessedPreview] = useState<string>('')
  const [originalSize, setOriginalSize] = useState(0)
  const [processedSize, setProcessedSize] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Compress / Convert options
  const [imgFormat, setImgFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg')
  const [imgQuality, setImgQuality] = useState(0.8)

  // 2. Resize options
  const [resizeWidth, setResizeWidth] = useState(800)
  const [resizeHeight, setResizeHeight] = useState(600)

  // 3. Passport options
  const [passportBg, setPassportBg] = useState<'white' | 'blue' | 'navy'>('white')

  // 4. Signature options
  const [sigThreshold, setSigThreshold] = useState(150)

  // 5. Scanner options
  const [scanFilter, setScanFilter] = useState<'grayscale' | 'binarized' | 'high-contrast'>('high-contrast')
  const [scanThreshold, setScanThreshold] = useState(128)

  // Handle file select
  const handleFileChange = (file: File) => {
    setSelectedFile(file)
    setOriginalSize(file.size)
    setProcessedPreview('')
    setProcessedSize(0)

    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
      // Auto-set initial dimensions
      const img = new Image()
      img.onload = () => {
        setResizeWidth(img.width)
        setResizeHeight(img.height)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  // --- 1. Compress & Convert Logic ---
  const runCompression = () => {
    if (!imagePreview) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0)
      const mime = `image/${imgFormat}`
      const dataUrl = canvas.toDataURL(mime, imgQuality)
      
      setProcessedPreview(dataUrl)
      // Calculate approximate size from Base64
      const approxSize = Math.round((dataUrl.length - 22) * 3 / 4)
      setProcessedSize(approxSize)

      addRecentFile(selectedFile?.name || 'compressed_image.jpg', 'Compressed', originalSize, originalSize - approxSize, '/image')
    }
    img.src = imagePreview
  }

  // --- 2. Resize Logic ---
  const runResize = () => {
    if (!imagePreview) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = resizeWidth
      canvas.height = resizeHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0, resizeWidth, resizeHeight)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setProcessedPreview(dataUrl)
      const approxSize = Math.round((dataUrl.length - 22) * 3 / 4)
      setProcessedSize(approxSize)

      addRecentFile('resized_image.jpg', 'Compressed', originalSize, 0, '/image')
    }
    img.src = imagePreview
  }

  // --- 3. Passport Photo Maker ---
  const runPassportMaker = () => {
    if (!imagePreview) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // Passport standard ratio (35mm x 45mm => 350px x 450px)
      canvas.width = 350
      canvas.height = 450
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Fill selected background color
      const bgColors = {
        white: '#ffffff',
        blue: '#00bfff',
        navy: '#000080'
      }
      ctx.fillStyle = bgColors[passportBg]
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw face with slight offset (simulating cropping)
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 1.2
      const w = img.width * scale
      const h = img.height * scale
      const x = (canvas.width - w) / 2
      const y = (canvas.height - h) / 3 // keep head in upper third

      ctx.drawImage(img, x, y, w, h)
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      setProcessedPreview(dataUrl)
      setProcessedSize(Math.round((dataUrl.length - 22) * 3 / 4))

      addRecentFile('passport_photo.jpg', 'Generated', 0, 0, '/image')
    }
    img.src = imagePreview
  }

  // --- 4. Signature Extractor ---
  const runSignatureExtraction = () => {
    if (!imagePreview) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data

      // Erase white background pixels using thresholding
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Luminance calculation
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
        
        if (luminance > sigThreshold) {
          // Make pixel fully transparent
          data[i + 3] = 0
        } else {
          // Enhance dark contrast (darken pen strokes)
          data[i] = Math.max(0, r - 50)
          data[i + 1] = Math.max(0, g - 50)
          data[i + 2] = Math.max(0, b - 50)
        }
      }

      ctx.putImageData(imgData, 0, 0)
      const dataUrl = canvas.toDataURL('image/png') // MUST be PNG for transparency
      setProcessedPreview(dataUrl)
      setProcessedSize(Math.round((dataUrl.length - 22) * 3 / 4))

      addRecentFile('extracted_signature.png', 'Generated', 0, 0, '/image')
    }
    img.src = imagePreview
  }

  // --- 5. Document Scanner (Binarization & High Contrast) ---
  const runScanner = () => {
    if (!imagePreview) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b

        if (scanFilter === 'grayscale') {
          data[i] = luminance
          data[i + 1] = luminance
          data[i + 2] = luminance
        } else if (scanFilter === 'binarized') {
          // Pure Black or White (binarization)
          const val = luminance > scanThreshold ? 255 : 0
          data[i] = val
          data[i + 1] = val
          data[i + 2] = val
        } else if (scanFilter === 'high-contrast') {
          // Stretch contrast to clear shadows
          const contrast = 1.8 // factor
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
          const val = factor * (luminance - 128) + 128
          const cleanVal = Math.min(255, Math.max(0, val))
          data[i] = cleanVal
          data[i + 1] = cleanVal
          data[i + 2] = cleanVal
        }
      }

      ctx.putImageData(imgData, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setProcessedPreview(dataUrl)
      setProcessedSize(Math.round((dataUrl.length - 22) * 3 / 4))

      addRecentFile('scanned_document.jpg', 'Scanned', originalSize, 0, '/image')
    }
    img.src = imagePreview
  }

  const triggerReset = () => {
    setSelectedFile(null)
    setImagePreview('')
    setProcessedPreview('')
    setOriginalSize(0)
    setProcessedSize(0)
  }

  return (
    <ToolPageShell
      title="Image Suite"
      description="Compress, convert formats, extract signatures, generate passport photos, and binarize scanned documents."
      suiteLabel="Workspace OS"
      suiteRoute="/"
      icon="🖼️"
    >
      <div className="workspace-grid" style={{ gridTemplateColumns: '240px 1fr', gap: '2rem' }}>
        
        {/* Sidebar */}
        <aside style={{ background: 'var(--panel-bg)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border)' }} className="glass">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.5rem', display: 'block' }}>Tools</span>
          {[
            { id: 'compress', label: 'Compress & Convert', icon: '🗜️' },
            { id: 'resize', label: 'Resize & Dimensions', icon: '📐' },
            { id: 'passport', label: 'Passport Photo', icon: '🆔' },
            { id: 'signature', label: 'Extract Signature', icon: '✒️' },
            { id: 'scanner', label: 'Document Scanner', icon: '🔍' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setProcessedPreview(''); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.65rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: activeTab === tab.id ? 'var(--accent-soft)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s',
              }}
              className="hover-lift"
            >
              <span>{tab.icon}</span>
              <span style={{ fontSize: '0.85rem' }}>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Content Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* File Picker */}
          {!selectedFile ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                border: '2px dashed var(--border)', 
                borderRadius: '1rem', 
                padding: '4rem 2rem', 
                textAlign: 'center', 
                cursor: 'pointer', 
                background: 'var(--panel-bg)' 
              }}
              className="glass hover-lift"
            >
              <FiImage size={48} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
              <h3>Select Image File to Begin</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                PNG, JPG, or WebP up to 15MB. All processing runs locally.
              </p>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} 
              />
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-bg)', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <FiImage />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedFile.name} ({formatFileSize(originalSize)})</span>
              </div>
              <button onClick={triggerReset} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>Change Image</button>
            </div>
          )}

          {/* Interactive Workspace */}
          {selectedFile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-2col">
              
              {/* Controls Column */}
              <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem' }} className="glass">
                
                {/* 1. Compress tab controls */}
                {activeTab === 'compress' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <label className="select-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      Output Format
                      <select value={imgFormat} onChange={e => setImgFormat(e.target.value as any)}>
                        <option value="jpeg">Convert to JPEG</option>
                        <option value="png">Convert to PNG (Lossless)</option>
                        <option value="webp">Convert to WebP (Optimized)</option>
                      </select>
                    </label>

                    <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      Quality compression ratio ({Math.round(imgQuality * 100)}%)
                      <input 
                        type="range" 
                        min={0.1} 
                        max={1.0} 
                        step={0.05} 
                        value={imgQuality} 
                        onChange={e => setImgQuality(parseFloat(e.target.value))} 
                      />
                    </label>

                    <button className="btn-primary" onClick={runCompression}>Process Compression</button>
                  </div>
                )}

                {/* 2. Resize tab controls */}
                {activeTab === 'resize' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <label className="input-label" style={{ flex: 1 }}>
                        Width (pixels)
                        <input type="number" value={resizeWidth} onChange={e => setResizeWidth(parseInt(e.target.value) || 0)} />
                      </label>
                      <label className="input-label" style={{ flex: 1 }}>
                        Height (pixels)
                        <input type="number" value={resizeHeight} onChange={e => setResizeHeight(parseInt(e.target.value) || 0)} />
                      </label>
                    </div>

                    <button className="btn-primary" onClick={runResize}>Apply Resize</button>
                  </div>
                )}

                {/* 3. Passport Photo controls */}
                {activeTab === 'passport' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <label className="select-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      Passport Background Color
                      <select value={passportBg} onChange={e => setPassportBg(e.target.value as any)}>
                        <option value="white">White Backdrop (US/India Standard)</option>
                        <option value="blue">Light Blue Backdrop</option>
                        <option value="navy">Navy Blue Backdrop</option>
                      </select>
                    </label>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                      <span>ℹ️</span>
                      <span>Ensures head alignment fits the formal passport layout box. Standard 3.5cm x 4.5cm output grid will print.</span>
                    </div>

                    <button className="btn-primary" onClick={runPassportMaker}>Generate Passport Photo</button>
                  </div>
                )}

                {/* 4. Signature controls */}
                {activeTab === 'signature' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      Paper Brightness Cutoff ({sigThreshold})
                      <input 
                        type="range" 
                        min={50} 
                        max={220} 
                        step={5} 
                        value={sigThreshold} 
                        onChange={e => setSigThreshold(parseInt(e.target.value))} 
                      />
                    </label>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Adjust slider until only hand-ink strokes remain, rendering paper borders transparent.
                    </div>

                    <button className="btn-primary" onClick={runSignatureExtraction}>Isolate Signature (PNG)</button>
                  </div>
                )}

                {/* 5. Scanner controls */}
                {activeTab === 'scanner' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <label className="select-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      Scan filter mode
                      <select value={scanFilter} onChange={e => setScanFilter(e.target.value as any)}>
                        <option value="high-contrast">High Contrast Photocopy (Document-ready)</option>
                        <option value="binarized">Pure Black & White (Max legibility)</option>
                        <option value="grayscale">Grayscale Photo</option>
                      </select>
                    </label>

                    {scanFilter === 'binarized' && (
                      <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        Binarization Threshold ({scanThreshold})
                        <input 
                          type="range" 
                          min={20} 
                          max={220} 
                          value={scanThreshold} 
                          onChange={e => setScanThreshold(parseInt(e.target.value))} 
                        />
                      </label>
                    )}

                    <button className="btn-primary" onClick={runScanner}>Scan Document</button>
                  </div>
                )}

              </div>

              {/* Preview Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {processedPreview ? 'Processed Result' : 'Original Preview'}
                </span>
                
                {activeTab === 'passport' && !processedPreview ? (
                  /* Oval crop template guide */
                  <div className="passport-photo-canvas-wrapper">
                    <img src={imagePreview} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    <div className="passport-overlay-guide"></div>
                  </div>
                ) : (
                  <div 
                    style={{ 
                      border: '1px solid var(--border)', 
                      borderRadius: '0.75rem', 
                      background: 'var(--panel-bg)', 
                      padding: '0.5rem', 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      maxHeight: '340px',
                      overflow: 'hidden',
                      width: '100%'
                    }}
                  >
                    <img 
                      src={processedPreview || imagePreview} 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '320px', 
                        objectFit: 'contain',
                        background: activeTab === 'signature' ? 'repeating-conic-gradient(#fff 0% 25%, #eee 0% 50%) 50% / 20px 20px' : 'transparent' 
                      }} 
                    />
                  </div>
                )}

                {processedPreview && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Original: {formatFileSize(originalSize)} • Processed: {formatFileSize(processedSize)}
                    </div>
                    <a 
                      href={processedPreview} 
                      download={activeTab === 'signature' ? 'signature.png' : 'shreedesk_image.jpg'}
                      className="btn-primary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
                    >
                      <FiDownload /> Download Result
                    </a>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </ToolPageShell>
  )
}

export default ImageSuitePages
