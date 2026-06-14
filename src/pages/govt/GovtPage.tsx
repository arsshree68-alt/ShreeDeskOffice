import { useMemo, useState } from 'react'
import SuiteToolCard from '../../components/ui/SuiteToolCard'

interface GovToolEntry {
  id: string
  title: string
  description: string
  icon: string
  route: string
  badge?: string
  info: {
    purpose: string
    useCase: string
    requiredInput: string
    outputExample: string
    department: string
  }
}

const GOV_TOOLS: GovToolEntry[] = [
  {
    id: 'hlb',
    title: 'HLB Consolidator',
    description: 'Merge health block data from multiple spreadsheets into a district-level report.',
    icon: '🏥',
    route: '/govt/hlb',
    info: {
      purpose: 'Consolidate Health & Local Body (HLB) data from multiple CHC/PHC-level spreadsheets into a unified district report.',
      useCase: 'District health officers receive block-level Excel reports from ANMs and supervisors and need to aggregate them for submission to state headquarters.',
      requiredInput: 'XLSX/CSV files with columns: Block Name, Indicator, Value, Month, Year.',
      outputExample: 'District-level summary XLSX with pivot-ready data, totals by block, and validation flags.',
      department: 'Health & Family Welfare, NHM district offices.',
    },
  },
  {
    id: 'compliance',
    title: 'Compliance Checker',
    description: 'Scan reports against public sector formatting and terminology standards.',
    icon: '✅',
    route: '/govt/compliance',
    badge: 'Soon',
    info: {
      purpose: 'Automatically verify that official documents conform to prescribed formatting standards (GoI, state-level circulars).',
      useCase: 'Nodal officers need to ensure letters, orders, and reports follow prescribed templates before forwarding to higher offices.',
      requiredInput: 'DOCX or PDF official document.',
      outputExample: 'Compliance report listing formatting violations, missing mandatory fields, and suggested corrections.',
      department: 'Any government department dealing with official correspondence.',
    },
  },
  {
    id: 'redact',
    title: 'Document Redaction',
    description: 'Securely redact PII and sensitive data from public releases.',
    icon: '🛡️',
    route: '/govt/redact',
    badge: 'Soon',
    info: {
      purpose: 'Mask or permanently remove personally identifiable information (PII), Aadhaar numbers, phone numbers from documents before RTI/public release.',
      useCase: 'PIOs redacting sensitive beneficiary data before sharing documents under RTI Act.',
      requiredInput: 'PDF or DOCX with sensitive data.',
      outputExample: 'Redacted PDF with blacked-out PII, suitable for public release.',
      department: 'DPIO offices, RTI cells, any public authority.',
    },
  },
  {
    id: 'archive',
    title: 'Archive Prep',
    description: 'Convert documents to PDF/A for long-term government archival.',
    icon: '📦',
    route: '/govt/archive',
    badge: 'Soon',
    info: {
      purpose: 'Convert documents to ISO-standard PDF/A format which preserves content integrity for 10+ years without software dependency.',
      useCase: 'Record rooms converting legacy DOCX/DOC files to archival-grade PDF/A as mandated by e-Records policy.',
      requiredInput: 'DOCX, DOC, or regular PDF.',
      outputExample: 'PDF/A compliant file with embedded fonts, no external dependencies.',
      department: 'District record rooms, state archives, NIC offices.',
    },
  },
]

const InfoPanel = ({ tool, onClose }: { tool: GovToolEntry; onClose: () => void }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
  }} onClick={onClose}>
    <div style={{
      background: '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '540px', width: '100%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative'
    }} onClick={e => e.stopPropagation()}>
      <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{tool.icon}</div>
      <h3 style={{ margin: '0 0 1.25rem 0', color: '#1F1B16' }}>{tool.title}</h3>
      {[
        { label: '📌 Purpose', value: tool.info.purpose },
        { label: '🔧 Use Case', value: tool.info.useCase },
        { label: '📂 Required Input', value: tool.info.requiredInput },
        { label: '📄 Output Example', value: tool.info.outputExample },
        { label: '🏛 Department', value: tool.info.department },
      ].map(({ label, value }) => (
        <div key={label} style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#c96442', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
          <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>{value}</div>
        </div>
      ))}
    </div>
  </div>
)

const GovtPage = () => {
  const [search, setSearch] = useState('')
  const [infoTool, setInfoTool] = useState<GovToolEntry | null>(null)

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return GOV_TOOLS
    return GOV_TOOLS.filter((t) =>
      `${t.title} ${t.description}`.toLowerCase().includes(q),
    )
  }, [search])

  return (
    <main className="page-shell">
      {infoTool && <InfoPanel tool={infoTool} onClose={() => setInfoTool(null)} />}

      <div className="page-header-group">
        <span className="page-eyebrow">Public Sector</span>
        <h1>Government Suite</h1>
        <p>
          Compliance-oriented workflows, public sector reporting, and document management
          features tailored for government operations. All tools run 100% locally — no data
          leaves your device.
        </p>
      </div>

      <section className="pdf-tool-browser" style={{ marginTop: '2.5rem' }}>
        <div className="pdf-tool-browser-head">
          <div>
            <span className="section-eyebrow">Modules</span>
            <h2>GovTech Workflows</h2>
          </div>
          <label className="pdf-search-label">
            <span>Search Government tools</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hlb, compliance…"
            />
          </label>
        </div>

        <div className="pdf-tool-card-grid">
          {filteredTools.map((tool) => (
            <div key={tool.id} style={{ position: 'relative' }}>
              <SuiteToolCard
                id={tool.id}
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                route={tool.route}
                badge={tool.badge}
              />
              <button
                onClick={() => setInfoTool(tool)}
                title="About this tool"
                style={{
                  position: 'absolute', top: '0.75rem', right: '0.75rem',
                  background: 'rgba(255,255,255,0.9)', border: '1px solid #e4e0d9',
                  borderRadius: '50%', width: '24px', height: '24px',
                  fontSize: '0.75rem', fontWeight: 700, color: '#c96442',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}
              >ⓘ</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default GovtPage
