import ResultSummaryCard from '../ui/ResultSummaryCard'
import { useCallback, useEffect, useMemo, useState } from 'react'
import PdfFileDropzone from '../pdf/PdfFileDropzone'
import PdfProgressBar from '../pdf/PdfProgressBar'
import { formatFileSize } from '../../tools/pdf/engine/fileUtils'

// Assuming a shared types file exists, defining inline for structural reference
export interface ImageToolDefinition {
  id: 'compress' | 'resize' | 'crop' | 'convert' | 'filter'
  title: string
  description: string
  icon: React.ReactNode | string
  acceptsMultiple: boolean
}

interface ImageToolWorkspaceProps {
  tool: ImageToolDefinition
}

const ImageToolWorkspace = ({ tool }: ImageToolWorkspaceProps) => {
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<{ label: string; value: number } | null>(null)
  const [output, setOutput] = useState<{ blob: Blob; fileName: string } | null>(null)
  const [feedback, setFeedback] = useState('Upload images to begin local processing.')
  const [processing, setProcessing] = useState(false)

  // Tool-specific states
  const [quality, setQuality] = useState(80)
  const [resizeWidth, setResizeWidth] = useState(1920)
  const [resizeHeight, setResizeHeight] = useState(1080)
  const [maintainAspect, setMaintainAspect] = useState(true)
  const [cropRatio, setCropRatio] = useState<'free' | '1:1' | '4:3' | '16:9'>('free')
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg')
  const [filterPreset, setFilterPreset] = useState<'none' | 'grayscale' | 'sepia' | 'blur'>('none')

  const estimatedImageRatio = useMemo(() => {
    // PNG is lossless; quality slider doesn't meaningfully reduce size, so estimate stays near 1.
    if (outputFormat === 'png') return 0.95
    const q = quality / 100
    // Non-linear curve: JPEG/WEBP size drops sharply below ~80% quality with minimal visible loss,
    // then drops further at very low settings. Roughly mirrors real-world libjpeg behavior.
    const ratio = 0.08 + 0.92 * Math.pow(q, 1.8)
    return Math.max(0.05, Math.min(1, ratio))
  }, [quality, outputFormat])

  const imageSize = useMemo(() => imageFiles.reduce((sum, file) => sum + file.size, 0), [imageFiles])
  const imagePreviews = useMemo(
    () => imageFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    })),
    [imageFiles],
  )

  useEffect(() => () => {
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
  }, [imagePreviews])

  const handleFilesSelected = useCallback((files: File[]) => {
    setOutput(null)
    setImageFiles(files)
    setFeedback(`${files.length} image file${files.length === 1 ? '' : 's'} ready for processing.`)
  }, [])

  const processImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));

        let targetWidth = img.width;
        let targetHeight = img.height;

        if (tool.id === 'resize') {
          if (maintainAspect) {
            const ratio = img.width / img.height;
            if (resizeWidth / resizeHeight > ratio) {
              targetWidth = resizeHeight * ratio;
              targetHeight = resizeHeight;
            } else {
              targetWidth = resizeWidth;
              targetHeight = resizeWidth / ratio;
            }
          } else {
            targetWidth = resizeWidth;
            targetHeight = resizeHeight;
          }
        }

        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (tool.id === 'crop' && cropRatio !== 'free') {
          const [rw, rh] = cropRatio.split(':').map(Number);
          const targetRatio = rw / rh;
          const currentRatio = img.width / img.height;
          if (currentRatio > targetRatio) {
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / targetRatio;
            sy = (img.height - sh) / 2;
          }
          targetWidth = sw;
          targetHeight = sh;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        if (tool.id === 'filter' && filterPreset !== 'none') {
          if (filterPreset === 'grayscale') ctx.filter = 'grayscale(100%)';
          if (filterPreset === 'sepia') ctx.filter = 'sepia(100%)';
          if (filterPreset === 'blur') ctx.filter = 'blur(4px)';
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

        const mimeType = outputFormat === 'png' ? 'image/png' : outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
        const q = tool.id === 'compress' ? quality / 100 : 0.92;

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas export failed'));
        }, mimeType, q);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const runTool = async () => {
    setProcessing(true)
    setOutput(null)
    setProgress({ label: '⬆ Uploading & Validating images...', value: 10 })

    try {
      // Real Image Processing Execution
      setProgress({ label: '⚙ Processing images...', value: 40 })
      const processedBlobs = await Promise.all(imageFiles.map(file => processImage(file)));
      setProgress({ label: '📦 Generating output...', value: 90 })
      
      setOutput({
        blob: processedBlobs[0], // Exporting first processed file for single-file demo
        fileName: `ShreeDesk_${tool.id}_output.${outputFormat}`,
      })
      setProgress({ label: 'Task Completed Successfully', value: 100 })
      setFeedback('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
      setFeedback(`❌ Error: ${message}`)
      setProgress(null)
    } finally {
      setProcessing(false)
    }
  }

  const isReady = imageFiles.length > 0

  return (
    <section className="pdf-workspace" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
      
      {/* Top Header */}
      <div className="pdf-workspace-header" style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '12px', border: '1px solid #E4E0D9', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '600px' }}>
          <span className="pdf-workspace-kicker" style={{ color: '#6B6459', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Image Workspace</span>
          <h2 style={{ fontSize: '1.875rem', marginTop: '0.5rem', marginBottom: '0.5rem', color: '#1F1B16', fontWeight: 600, letterSpacing: '-0.02em' }}>{tool.icon} {tool.title}</h2>
          <p style={{ fontSize: '1rem', color: '#6B6459', margin: 0 }}>{tool.description}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
          <span className="pdf-local-badge" style={{ background: '#F0EDE8', color: '#4b5563', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500 }}>🔒 Processed Locally</span>
        </div>
      </div>

      {!isReady ? (
        <PdfFileDropzone
          mode="image"
          multiple={tool.acceptsMultiple}
          disabled={processing}
          onFilesSelected={handleFilesSelected}
        />
      ) : (
        <div className="pdf-workspace-grid">
          
          {/* Left: Image Preview Area */}
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E4E0D9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1F1B16', margin: 0 }}>Image Previews</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#6B6459' }}>
                  {imageFiles.length} file(s) · {formatFileSize(imageSize)}
                </div>
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#ffffff', color: '#4A4438', fontSize: '0.85rem', fontWeight: 500 }}>
                  <input type="file" multiple={tool.acceptsMultiple} accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelected(Array.from(e.target.files))
                    }
                  }} />
                  <span>+ Add Images</span>
                </label>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
              {imagePreviews.map((preview) => (
                <div key={preview.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E4E0D9', background: '#F0EDE8', aspectRatio: '1/1' }}>
                  <img src={preview.url} alt={preview.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {preview.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Settings & Actions */}
          <div className="pdf-workspace-options" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E4E0D9' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 600, color: '#1F1B16' }}>Settings</h3>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              
              {/* Compress Settings */}
              {tool.id === 'compress' && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Quality</span>
                      <span style={{ color: 'var(--accent-warm)', fontWeight: 700 }}>{quality}%</span>
                    </div>
                    <input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} style={{ width: '100%' }} />
                  </label>
                  {imageFiles.length > 0 && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '1rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ color: '#6b7280' }}>Original Size</span>
                        <strong style={{ color: '#1f1b16' }}>{formatFileSize(imageSize)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ color: '#6b7280' }}>Quality Selected</span>
                        <strong style={{ color: '#1f1b16' }}>{quality}%</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #86efac' }}>
                        <span style={{ color: '#6b7280' }}>Estimated Output</span>
                        <strong style={{ color: '#059669' }}>~{formatFileSize(Math.round(imageSize * estimatedImageRatio))}</strong>
                      </div>
                      <div style={{ textAlign: 'center', color: '#059669', fontWeight: 700, fontSize: '1rem' }}>
                        ~{Math.max(0, Math.round((1 - estimatedImageRatio) * 100))}% size reduction
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resize Settings */}
              {tool.id === 'resize' && (
                <>
                  <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                      Width (px)
                      <input type="number" className="pdf-text-input" value={resizeWidth} onChange={(e) => setResizeWidth(Number(e.target.value))} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                      Height (px)
                      <input type="number" className="pdf-text-input" value={resizeHeight} onChange={(e) => setResizeHeight(Number(e.target.value))} />
                    </label>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={maintainAspect} onChange={(e) => setMaintainAspect(e.target.checked)} />
                    Maintain Aspect Ratio
                  </label>
                </>
              )}

              {/* Crop Settings */}
              {tool.id === 'crop' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  Aspect Ratio Preset
                  <select className="pdf-text-input" value={cropRatio} onChange={(e) => setCropRatio(e.target.value as any)}>
                    <option value="free">Freeform</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3 (Standard)</option>
                    <option value="16:9">16:9 (Widescreen)</option>
                  </select>
                </label>
              )}

              {/* Filter Settings */}
              {tool.id === 'filter' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  Apply Filter
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['none', 'grayscale', 'sepia', 'blur'].map((preset) => (
                      <button 
                        key={preset} 
                        onClick={() => setFilterPreset(preset as any)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', border: `1px solid ${filterPreset === preset ? '#f97316' : '#E4E0D9'}`, background: filterPreset === preset ? '#fff7ed' : '#ffffff', color: filterPreset === preset ? '#ea580c' : '#4A4438', cursor: 'pointer', textTransform: 'capitalize' }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </label>
              )}

              {/* Universal Output Format for Images */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Export Format
                <select className="pdf-text-input" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as any)}>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WEBP</option>
                </select>
              </label>
            </div>

            {/* Processing and Export */}
            <div style={{ marginTop: '2.5rem' }}>
              <PdfProgressBar progress={progress as any} />
              {feedback && (
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: feedback.includes('❌') ? '#ef4444' : 'var(--text-muted)' }}>{feedback}</p>
              )}

              <div style={{ display: 'grid', gap: '1rem' }}>
                {!output && (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={processing}
                    onClick={runTool}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', fontWeight: 500, background: '#1F1B16', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                  >
                    {processing ? 'Processing...' : `Run ${tool.title}`}
                  </button>
                )}
                
                {output && (
                  <ResultSummaryCard
                    inputSize={imageSize}
                    outputSize={output.blob.size}
                    filesProcessed={imageFiles.length}
                    outputBlob={output.blob}
                    outputFileName={output.fileName}
                    onStartNew={() => {
                      setOutput(null)
                      setImageFiles([])
                      setProgress(null)
                      setFeedback('Upload images to begin local processing.')
                    }}
                    onReuseFiles={() => {
                      setOutput(null)
                      setProgress(null)
                      setFeedback('Files retained. Adjust settings and run again.')
                    }}
                  />
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  )
}

export default ImageToolWorkspace