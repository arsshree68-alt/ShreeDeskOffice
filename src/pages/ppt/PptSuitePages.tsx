import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import ToolPageShell from '../../components/ui/ToolPageShell'
import { FiCpu, FiLayers, FiDownload, FiTrash2, FiPlus } from 'react-icons/fi'
import { useRecentFiles } from '../../hooks/useRecentFiles'
import pptxgen from 'pptxgenjs'
import { getGoogleToken, uploadFileToDrive } from '../../utils/googleDrive'

interface Slide {
  id: string
  title: string
  bulletPoints: string[]
  layout: 'title' | 'content' | 'split'
}

const getTabFromPath = (path: string): 'manager' | 'ai-presentation' => {
  if (path.includes('/ppt/topic-to-ppt') || path.includes('/ppt/ai') || path.includes('/ppt/gov-presentation') || path.includes('/ppt/report-to-ppt')) {
    return 'ai-presentation'
  }
  return 'manager'
}

const PptSuitePages = () => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<'manager' | 'ai-presentation'>(() => getTabFromPath(window.location.pathname))
  const { addRecentFile } = useRecentFiles()

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname))
  }, [location.pathname])

  // --- Slide Manager States ---
  const [slides, setSlides] = useState<Slide[]>([])

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)

  // --- AI Presentation States ---
  const [pptTopic, setPptTopic] = useState('')
  const [pptNumSlides, setPptNumSlides] = useState(6)
  const [pptTemplate, setPptTemplate] = useState<'official' | 'modern' | 'minimal'>('official')
  const [aiSlides, setAiSlides] = useState<Slide[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  // Move slide up
  const moveSlideUp = (index: number) => {
    if (index === 0) return
    const next = [...slides]
    const temp = next[index]
    next[index] = next[index - 1]
    next[index - 1] = temp
    setSlides(next)
  }

  // Move slide down
  const moveSlideDown = (index: number) => {
    if (index === slides.length - 1) return
    const next = [...slides]
    const temp = next[index]
    next[index] = next[index + 1]
    next[index + 1] = temp
    setSlides(next)
  }

  // Delete slide
  const deleteSlide = (id: string) => {
    const next = slides.filter(s => s.id !== id)
    setSlides(next)
    if (selectedSlideId === id && next.length > 0) {
      setSelectedSlideId(next[0].id)
    }
  }

  // AI Slide Outline Generator
  const generateAiPresentation = async () => {
    if (!pptTopic.trim()) return
    setAiLoading(true)
    setAiSlides([])

    const geminiKey = localStorage.getItem('shreedesk-gemini-key')

    if (geminiKey) {
      try {
        const prompt = `Create a structured slide deck outline on "${pptTopic}" containing exactly ${pptNumSlides} slides. Output ONLY a JSON array matching this format: [{"title": "Slide Title", "bulletPoints": ["point 1", "point 2"], "layout": "content"}]. Do not add markdown codeblocks, only pure JSON.`
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        
        // Clean JSON formatting
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleanJson)
        const mapped = parsed.map((s: any, idx: number) => ({
          id: Math.random().toString(36).substring(2, 9),
          title: s.title || `Slide ${idx + 1}`,
          bulletPoints: s.bulletPoints || [],
          layout: s.layout || 'content'
        }))
        setAiSlides(mapped)
      } catch (err) {
        console.error(err)
        // fallback to mock on JSON parse error
        loadMockAiPresentation()
      } finally {
        setAiLoading(false)
      }
    } else {
      setTimeout(() => {
        loadMockAiPresentation()
        setAiLoading(false)
      }, 1500)
    }
  }

  const loadMockAiPresentation = () => {
    const mock: Slide[] = [
      { id: 'ai-1', title: pptTopic, bulletPoints: ['Official Departmental Proposal', `Target Scope: ${pptNumSlides} schools`, `Sanction Budget: FY 2026-27`], layout: 'title' },
      { id: 'ai-2', title: 'Problem Statement & Needs', bulletPoints: ['Power outages disrupt school teaching programs', 'Lack of light affects digital learning equipment', 'Alternative green grid required for local self-sustainment'], layout: 'content' },
      { id: 'ai-3', title: 'Solar Energy Implementation Plan', bulletPoints: ['Install 5kW rooftop solar panels per school', 'Hybrid grid with battery backups for rainy months', 'Estimated implementation duration: 90 days'], layout: 'content' },
      { id: 'ai-4', title: 'Detailed School-wise Phased Rollout', bulletPoints: ['Phase 1: 50 primary school pilot blocks', 'Phase 2: 120 secondary blocks', 'Continuous audit inspections via local engineers'], layout: 'content' },
      { id: 'ai-5', title: 'Project Cost Matrix & Budgets', bulletPoints: ['Installation cost per unit: Rs. 1.2 Lakhs', 'Maintenance outlay (5 years): Rs. 20,000', 'Cleared under Central Green Schools grant'], layout: 'split' },
      { id: 'ai-6', title: 'Expected Strategic Milestones', bulletPoints: ['Zero dependency on traditional grids', '100% solar supply in summer blocks', 'Reduction of school electricity expense log by 92%'], layout: 'content' }
    ]
    setAiSlides(mock.slice(0, pptNumSlides))
  }

  // Export current slide deck to real PPTX presentation
  const handleExportPresentation = () => {
    const list = activeTab === 'manager' ? slides : aiSlides
    if (list.length === 0) return

    const pres = new pptxgen()
    
    // Set presentation properties
    pres.title = "ShreeDesk Presentation"
    pres.subject = "Office Outline"

    list.forEach((slide) => {
      const s = pres.addSlide()
      
      // Add Title
      s.addText(slide.title, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1.0,
        fontSize: 24,
        bold: true,
        color: '3b82f6', // Premium theme color
        fontFace: 'Arial'
      })

      // Add Bullet points
      if (slide.bulletPoints && slide.bulletPoints.length > 0) {
        s.addText(
          slide.bulletPoints.map(p => ({ text: p, options: { bullet: true } })),
          {
            x: 0.5,
            y: 1.8,
            w: '90%',
            h: 4.5,
            fontSize: 14,
            color: '333333',
            fontFace: 'Arial',
            lineSpacing: 22
          }
        )
      }
    })

    const topicSlug = pptTopic.trim() 
      ? pptTopic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 30) 
      : 'Presentation'
    const outputName = `ShreeDesk_${topicSlug}.pptx`

    // Write file client-side
    pres.writeFile({ fileName: outputName })
      .then(() => {
        addRecentFile(outputName, 'Generated', 0, 0, '/ppt')
      })
      .catch((err) => console.error('Error downloading presentation', err))

    // Upload to Google Drive if token exists
    const token = getGoogleToken()
    if (token) {
      pres.write({ outputType: 'blob' })
        .then(async (blob: any) => {
          await uploadFileToDrive('PPT', outputName, blob as Blob)
        })
        .catch(err => console.error('Error syncing presentation to Drive', err))
    }
  }

  const selectedSlide = (activeTab === 'manager' ? slides : aiSlides).find(s => s.id === selectedSlideId) || (activeTab === 'manager' ? slides[0] : aiSlides[0])

  return (
    <ToolPageShell
      title="PowerPoint Suite"
      description="Design presentations visually. Manage slide decks, reorder indexes, export individual slides, and draft outline decks with AI."
      suiteLabel="Workspace OS"
      suiteRoute="/"
      icon="📺"
    >
      <div className="workspace-grid" style={{ gridTemplateColumns: '240px 1fr', gap: '2rem' }}>
        
        {/* Sidebar */}
        <aside style={{ background: 'var(--panel-bg)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border)' }} className="glass">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.5rem', display: 'block' }}>Modules</span>
          <button
            onClick={() => { setActiveTab('manager'); if (slides.length > 0) setSelectedSlideId(slides[0].id); }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.65rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeTab === 'manager' ? 'var(--accent-soft)' : 'transparent',
              color: activeTab === 'manager' ? 'var(--accent)' : 'var(--text)',
              fontWeight: activeTab === 'manager' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <FiLayers />
            <span style={{ fontSize: '0.85rem' }}>Slide Manager</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('ai-presentation'); if (aiSlides.length > 0) setSelectedSlideId(aiSlides[0].id); }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.65rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: activeTab === 'ai-presentation' ? 'var(--accent-soft)' : 'transparent',
              color: activeTab === 'ai-presentation' ? 'var(--accent)' : 'var(--text)',
              fontWeight: activeTab === 'ai-presentation' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <FiCpu />
            <span style={{ fontSize: '0.85rem' }}>AI Presentation</span>
          </button>
        </aside>

        {/* Content Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Export Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Active slides: <strong>{(activeTab === 'manager' ? slides : aiSlides).length}</strong>
            </span>
            <button 
              className="btn-primary" 
              onClick={handleExportPresentation}
              disabled={(activeTab === 'manager' ? slides : aiSlides).length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FiDownload /> Export Slide Deck (.pptx)
            </button>
          </div>

          {/* 1. Slide Manager workspace */}
          {activeTab === 'manager' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }} className="responsive-2col">
              {/* Visual slides catalog */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Visual Deck Sorter</span>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      const newId = Math.random().toString(36).substring(2, 9)
                      const newSlide: Slide = {
                        id: newId,
                        title: 'New Slide',
                        bulletPoints: ['First bullet point...'],
                        layout: 'content'
                      }
                      setSlides([...slides, newSlide])
                      setSelectedSlideId(newId)
                    }}
                  >
                    <FiPlus /> Add Slide
                  </button>
                </div>
                
                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                  {slides.map((slide, idx) => (
                    <div 
                      key={slide.id} 
                      onClick={() => setSelectedSlideId(slide.id)}
                      className={`slide-thumbnail ${selectedSlideId === slide.id ? 'selected' : ''}`}
                    >
                      <span className="slide-thumbnail-number">{idx + 1}</span>
                      <strong style={{ display: 'block', fontSize: '0.8rem', marginTop: '1.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                        {slide.title}
                      </strong>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', pointerEvents: 'auto' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button onClick={(e) => { e.stopPropagation(); moveSlideUp(idx); }} style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem', border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: 'pointer', borderRadius: '4px' }}>▲</button>
                          <button onClick={(e) => { e.stopPropagation(); moveSlideDown(idx); }} style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem', border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: 'pointer', borderRadius: '4px' }}>▼</button>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteSlide(slide.id); }} style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem', border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', cursor: 'pointer', borderRadius: '4px' }} title="Delete slide">
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide Details Editor Preview */}
              <div 
                style={{ 
                  background: 'var(--panel-bg)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '1rem', 
                  padding: '2rem', 
                  minHeight: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                className="glass"
              >
                {selectedSlide ? (
                  <>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Active Slide Preview (Layout: {selectedSlide.layout})
                      </div>
                      
                      {/* Interactive edit block */}
                      <input
                        type="text"
                        value={selectedSlide.title}
                        onChange={(e) => {
                          const next = slides.map(s => s.id === selectedSlide.id ? { ...s, title: e.target.value } : s)
                          setSlides(next)
                        }}
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text)',
                          borderBottom: '2px solid var(--border)',
                          width: '100%',
                          paddingBottom: '0.25rem',
                          marginBottom: '1rem'
                        }}
                      />

                      <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedSlide.bulletPoints.map((point, idx) => (
                          <li key={idx}>
                            <input
                              type="text"
                              value={point}
                              onChange={(e) => {
                                const nextPts = [...selectedSlide.bulletPoints]
                                nextPts[idx] = e.target.value
                                const next = slides.map(s => s.id === selectedSlide.id ? { ...s, bulletPoints: nextPts } : s)
                                setSlides(next)
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text)',
                                width: '90%',
                                fontSize: '0.9rem'
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button 
                      className="btn-secondary" 
                      style={{ marginTop: '1.5rem', width: 'max-content', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => {
                        const nextPts = [...selectedSlide.bulletPoints, 'New bullet point...']
                        setSlides(slides.map(s => s.id === selectedSlide.id ? { ...s, bulletPoints: nextPts } : s))
                      }}
                    >
                      + Add Bullet Point
                    </button>
                  </>
                ) : (
                  <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No slides in template deck. Click "+ Add Slide" above to get started.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 2. AI Presentation outline creator */}
          {activeTab === 'ai-presentation' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }} className="responsive-2col">
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <label className="input-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  Presentation Topic
                  <textarea 
                    rows={4} 
                    value={pptTopic} 
                    onChange={e => setPptTopic(e.target.value)} 
                    placeholder="e.g. Budget review meeting guidelines..." 
                  />
                </label>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <label className="input-label" style={{ flex: 1 }}>
                    Slide Count
                    <input type="number" min={3} max={15} value={pptNumSlides} onChange={e => setPptNumSlides(parseInt(e.target.value) || 5)} />
                  </label>
                  <label className="select-label" style={{ flex: 1.5 }}>
                    Visual Template
                    <select value={pptTemplate} onChange={e => setPptTemplate(e.target.value as any)}>
                      <option value="official">Indian Administrative Seal</option>
                      <option value="modern">Modern Glassmorphism</option>
                      <option value="minimal">Clean Text Outline</option>
                    </select>
                  </label>
                </div>

                <button 
                  onClick={generateAiPresentation} 
                  className="btn-primary" 
                  disabled={aiLoading}
                  style={{ width: 'max-content' }}
                >
                  {aiLoading ? 'Drafting outline slides...' : 'Compile Presentation Outline'}
                </button>
              </div>

              {/* Renders generated slides */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {aiSlides.length > 0 ? (
                  <div style={{ display: 'grid', gap: '0.75rem', overflowY: 'auto', maxHeight: '420px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)' }}>Compiled AI Outline Decks:</span>
                    {aiSlides.map((slide, idx) => (
                      <div key={slide.id} style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.9rem' }}>Slide {idx + 1}: {slide.title}</strong>
                          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: 'var(--card-bg)', borderRadius: '4px', textTransform: 'uppercase' }}>{slide.layout}</span>
                        </div>
                        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-muted)' }}>
                          {slide.bulletPoints.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '6rem 0', border: '2px dashed var(--border)', borderRadius: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Outline compilation results will render here.
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

export default PptSuitePages
