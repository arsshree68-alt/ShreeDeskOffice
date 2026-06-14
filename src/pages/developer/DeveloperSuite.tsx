import { useState } from 'react'
import ToolPageShell from '../../components/ui/ToolPageShell'
import { FiCopy, FiCheck, FiSend } from 'react-icons/fi'

type DevTab = 'json' | 'csv-json' | 'xml' | 'base64' | 'hash' | 'api-tester'

const DeveloperSuite = () => {
  const [activeTab, setActiveTab] = useState<DevTab>('json')
  const [copied, setCopied] = useState(false)

  // JSON State
  const [jsonInput, setJsonInput] = useState('{"name":"TestApp","version":"1.0.0","features":["Auth","Dashboard"],"active":true}')
  const [jsonOutput, setJsonOutput] = useState('')
  const [jsonError, setJsonError] = useState('')

  // CSV/JSON State
  const [csvInput, setCsvInput] = useState('ID,Name,Role,Department\n1,Alice,Engineer,Tech\n2,Bob,Designer,Design\n3,Charlie,Manager,Sales')
  const [csvJsonOutput, setCsvJsonOutput] = useState('')

  // XML State
  const [xmlInput, setXmlInput] = useState('<project><app name="Test"><version>1.0.0</version></app></project>')
  const [xmlOutput, setXmlOutput] = useState('')

  // Base64 State
  const [b64Input, setB64Input] = useState('Hello World')
  const [b64Output, setB64Output] = useState('')
  const [b64Mode, setB64Mode] = useState<'encode' | 'decode'>('encode')

  // Hash State
  const [hashInput, setHashInput] = useState('Sample text to hash')
  const [hashOutput, setHashOutput] = useState({ md5: '', sha1: '', sha256: '' })

  // API Tester State
  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/todos/1')
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET')
  const [apiHeaders, setApiHeaders] = useState('Content-Type: application/json')
  const [apiBody, setApiBody] = useState('{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}')
  const [apiResponse, setApiResponse] = useState('')
  const [apiStatus, setApiStatus] = useState<number | null>(null)
  const [apiLoading, setApiLoading] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // --- JSON Formatter logic ---
  const formatJson = (minify = false) => {
    setJsonError('')
    try {
      const parsed = JSON.parse(jsonInput)
      if (minify) {
        setJsonOutput(JSON.stringify(parsed))
      } else {
        setJsonOutput(JSON.stringify(parsed, null, 2))
      }
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON syntax')
      setJsonOutput('')
    }
  }

  // --- CSV ⇆ JSON logic ---
  const csvToJson = () => {
    try {
      const lines = csvInput.split('\n').filter(l => l.trim() !== '')
      if (lines.length === 0) return
      const headers = lines[0].split(',')
      const result = []

      for (let i = 1; i < lines.length; i++) {
        const obj: Record<string, string> = {}
        const currentline = lines[i].split(',')

        headers.forEach((h, index) => {
          obj[h.trim()] = currentline[index]?.trim() || ''
        })
        result.push(obj)
      }
      setCsvJsonOutput(JSON.stringify(result, null, 2))
    } catch (e) {
      setCsvJsonOutput('Error parsing CSV. Ensure commas are correct.')
    }
  }

  const jsonToCsv = () => {
    try {
      const arr = JSON.parse(csvJsonOutput)
      if (!Array.isArray(arr) || arr.length === 0) {
        setCsvJsonOutput('Error: input must be a JSON array of objects.')
        return
      }
      const replacer = (_key: string, value: any) => value === null ? '' : value
      const header = Object.keys(arr[0])
      const csv = [
        header.join(','),
        ...arr.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
      ].join('\r\n')
      setCsvInput(csv)
      setCsvJsonOutput('Successfully converted to CSV in left pane!')
    } catch (e) {
      setCsvJsonOutput('Error parsing JSON. Ensure it is a valid JSON array.')
    }
  }

  // --- XML Formatter ---
  const formatXml = () => {
    try {
      let formatted = ''
      let reg = /(>)(<)(\/*)/g
      let xml = xmlInput.replace(reg, '$1\r\n$2$3')
      let pad = 0
      xml.split('\r\n').forEach((node) => {
        let indent = 0
        if (node.match(/.+<\/\w[^>]*>$/)) {
          indent = 0
        } else if (node.match(/^<\/\w/)) {
          if (pad !== 0) pad -= 1
        } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
          indent = 1
        } else {
          indent = 0
        }

        let padding = ''
        for (let i = 0; i < pad; i++) padding += '  '
        formatted += padding + node + '\r\n'
        pad += indent
      })
      setXmlOutput(formatted.trim())
    } catch (e) {
      setXmlOutput('Error parsing XML.')
    }
  }

  // --- Base64 logic ---
  const runBase64 = () => {
    try {
      if (b64Mode === 'encode') {
        setB64Output(btoa(unescape(encodeURIComponent(b64Input))))
      } else {
        setB64Output(decodeURIComponent(escape(atob(b64Input))))
      }
    } catch (e) {
      setB64Output('Decoding/Encoding Error. Ensure format is base64 compliant.')
    }
  }

  // --- Hash Generator logic ---
  const generateHashes = async () => {
    if (!hashInput) return

    // Pure JS MD5 implementation
    const calcMd5 = (str: string): string => {
      var k = [], i = 0;
      for (; i < 64; i++) {
        k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
      }
      var h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];
      var s = [
        7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
        5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
        4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
        6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
      ];
      var words: number[] = [];
      var n = str.length;
      for (i = 0; i < n; i++) {
        words[i >> 2] |= (str.charCodeAt(i) & 0xff) << ((i % 4) * 8);
      }
      words[n >> 2] |= 0x80 << ((n % 4) * 8);
      words[(((n + 8) >> 6) << 4) + 14] = n * 8;
      
      var rotateLeft = (l: number, r: number) => (l << r) | (l >>> (32 - r));
      var add = (x: number, y: number) => {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
      };
      
      for (var j = 0; j < words.length; j += 16) {
        var a = h[0], b = h[1], c = h[2], d = h[3];
        for (i = 0; i < 64; i++) {
          var f, g;
          if (i < 16) {
            f = (b & c) | (~b & d);
            g = i;
          } else if (i < 32) {
            f = (d & b) | (~d & c);
            g = (5 * i + 1) % 16;
          } else if (i < 48) {
            f = b ^ c ^ d;
            g = (3 * i + 5) % 16;
          } else {
            f = c ^ (b | ~d);
            g = (7 * i) % 16;
          }
          var temp = d;
          d = c;
          c = b;
          b = add(b, rotateLeft(add(a, add(f, add(k[i], words[j + g] || 0))), s[i]));
          a = temp;
        }
        h[0] = add(h[0], a);
        h[1] = add(h[1], b);
        h[2] = add(h[2], c);
        h[3] = add(h[3], d);
      }
      
      var result = '';
      for (i = 0; i < 4; i++) {
        for (var bIdx = 0; bIdx < 4; bIdx++) {
          var hex = ((h[i] >> (bIdx * 8)) & 0xFF).toString(16);
          result += hex.length === 1 ? '0' + hex : hex;
        }
      }
      return result;
    }

    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(hashInput)
      
      // SHA-256
      const hashBuffer256 = await crypto.subtle.digest('SHA-256', data)
      const hashArray256 = Array.from(new Uint8Array(hashBuffer256))
      const sha256 = hashArray256.map(b => b.toString(16).padStart(2, '0')).join('')

      // SHA-1
      const hashBuffer1 = await crypto.subtle.digest('SHA-1', data)
      const hashArray1 = Array.from(new Uint8Array(hashBuffer1))
      const sha1 = hashArray1.map(b => b.toString(16).padStart(2, '0')).join('')

      // MD5 (Real client-side calculation)
      const md5 = calcMd5(hashInput)

      setHashOutput({ md5, sha1, sha256 })
    } catch (e) {
      console.error(e)
    }
  }

  // --- API Tester logic ---
  const sendRequest = async () => {
    setApiLoading(true)
    setApiResponse('')
    setApiStatus(null)
    try {
      // Parse Headers
      const headersObj: Record<string, string> = {}
      apiHeaders.split('\n').forEach(line => {
        const parts = line.split(':')
        if (parts.length >= 2) {
          headersObj[parts[0].trim()] = parts.slice(1).join(':').trim()
        }
      })

      const options: RequestInit = {
        method: apiMethod,
        headers: headersObj
      }

      if (['POST', 'PUT'].includes(apiMethod)) {
        options.body = apiBody
      }

      const res = await fetch(apiUrl, options)
      setApiStatus(res.status)
      const text = await res.text()
      try {
        const parsed = JSON.parse(text)
        setApiResponse(JSON.stringify(parsed, null, 2))
      } catch (e) {
        setApiResponse(text)
      }
    } catch (err) {
      setApiResponse(err instanceof Error ? err.message : 'Request failed')
      setApiStatus(500)
    } finally {
      setApiLoading(false)
    }
  }

  return (
    <ToolPageShell
      title="Developer Suite"
      description="Format, validate, encode, hash, and test API endpoints. 100% offline-safe in-browser development tools."
      suiteLabel="Workspace OS"
      suiteRoute="/"
      icon="⚙️"
    >
      <div className="workspace-grid" style={{ gridTemplateColumns: '240px 1fr', gap: '2rem' }}>
        
        {/* Inner Tabs Sidebar */}
        <aside style={{ background: 'var(--panel-bg)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border)' }} className="glass">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.5rem', display: 'block' }}>Utilities</span>
          {[
            { id: 'json', label: 'JSON Formatter', icon: '📁' },
            { id: 'csv-json', label: 'CSV ⇆ JSON', icon: '🔄' },
            { id: 'xml', label: 'XML Formatter', icon: '💻' },
            { id: 'base64', label: 'Base64 Tool', icon: '🔑' },
            { id: 'hash', label: 'Hash Generator', icon: '#' },
            { id: 'api-tester', label: 'REST API Tester', icon: '📡' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setCopied(false); }}
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
          
          {/* 1. JSON Formatter & Validator */}
          {activeTab === 'json' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-2col">
                <div>
                  <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Raw JSON Input</label>
                  <textarea
                    rows={12}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn-primary" onClick={() => formatJson(false)}>Format Prettify</button>
                    <button className="btn-secondary" onClick={() => formatJson(true)}>Minify JSON</button>
                  </div>
                  {jsonError && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                      <strong>Syntax Error:</strong> {jsonError}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="input-label" style={{ fontWeight: 600 }}>Clean Output</label>
                    {jsonOutput && (
                      <button onClick={() => handleCopy(jsonOutput)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                        {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <textarea
                    readOnly
                    rows={12}
                    placeholder="Output will appear here..."
                    value={jsonOutput}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. CSV to JSON & JSON to CSV */}
          {activeTab === 'csv-json' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-2col">
                <div>
                  <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>CSV Sheets Raw Text</label>
                  <textarea
                    rows={12}
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <button className="btn-primary" onClick={csvToJson}>CSV → JSON Array &rarr;</button>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="input-label" style={{ fontWeight: 600 }}>JSON Array Output</label>
                    {csvJsonOutput && (
                      <button onClick={() => handleCopy(csvJsonOutput)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                        {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copy' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={12}
                    value={csvJsonOutput}
                    onChange={(e) => setCsvJsonOutput(e.target.value)}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <button className="btn-secondary" onClick={jsonToCsv}>&larr; JSON Array → CSV</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. XML Formatter */}
          {activeTab === 'xml' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-2col">
                <div>
                  <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>XML Document</label>
                  <textarea
                    rows={12}
                    value={xmlInput}
                    onChange={(e) => setXmlInput(e.target.value)}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <button className="btn-primary" onClick={formatXml}>Prettify XML</button>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="input-label" style={{ fontWeight: 600 }}>Formatted XML</label>
                    {xmlOutput && (
                      <button onClick={() => handleCopy(xmlOutput)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                        {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <textarea
                    readOnly
                    rows={12}
                    value={xmlOutput}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Base64 Encoder/Decoder */}
          {activeTab === 'base64' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <button className={`tab-btn ${b64Mode === 'encode' ? 'active' : ''}`} onClick={() => setB64Mode('encode')}>Encode Text</button>
                <button className={`tab-btn ${b64Mode === 'decode' ? 'active' : ''}`} onClick={() => setB64Mode('decode')}>Decode Base64</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-2col">
                <div>
                  <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Input Source</label>
                  <textarea
                    rows={10}
                    value={b64Input}
                    onChange={(e) => setB64Input(e.target.value)}
                    style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                  />
                  <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={runBase64}>Execute conversion</button>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="input-label" style={{ fontWeight: 600 }}>Output Result</label>
                    {b64Output && (
                      <button onClick={() => handleCopy(b64Output)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {copied ? <FiCheck /> : <FiCopy />}
                      </button>
                    )}
                  </div>
                  <textarea
                    readOnly
                    rows={10}
                    value={b64Output}
                    style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Hash Generator */}
          {activeTab === 'hash' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Source Text</label>
                <textarea
                  rows={4}
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                  placeholder="Type anything to compute checksums..."
                />
                <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={generateHashes}>Generate Cryptographic Hashes</button>
              </div>

              {hashOutput.sha256 && (
                <div style={{ display: 'grid', gap: '1rem', background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SHA-256 Checksum</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <code style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px', flex: 1, overflowX: 'auto', fontSize: '0.85rem' }}>{hashOutput.sha256}</code>
                      <button className="icon-btn" onClick={() => handleCopy(hashOutput.sha256)}><FiCopy /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SHA-1 Checksum</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <code style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px', flex: 1, overflowX: 'auto', fontSize: '0.85rem' }}>{hashOutput.sha1}</code>
                      <button className="icon-btn" onClick={() => handleCopy(hashOutput.sha1)}><FiCopy /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>MD5 Signature Checksum</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <code style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px', flex: 1, overflowX: 'auto', fontSize: '0.85rem' }}>{hashOutput.md5}</code>
                      <button className="icon-btn" onClick={() => handleCopy(hashOutput.md5)}><FiCopy /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. REST API Tester */}
          {activeTab === 'api-tester' && (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* Endpoint row */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={apiMethod}
                  onChange={(e) => setApiMethod(e.target.value as any)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--panel-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontWeight: 700
                  }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                  placeholder="https://api.example.com/v1/endpoint"
                />
                <button
                  className="btn-primary"
                  onClick={sendRequest}
                  disabled={apiLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {apiLoading ? 'Testing...' : <><FiSend /> Send</>}
                </button>
              </div>

              {/* Grid: Headers + Body */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-2col">
                <div>
                  <label className="input-label" style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.85rem', fontWeight: 600 }}>Headers (Key: Value)</label>
                  <textarea
                    rows={4}
                    value={apiHeaders}
                    onChange={(e) => setApiHeaders(e.target.value)}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                  />
                  
                  {['POST', 'PUT'].includes(apiMethod) && (
                    <div style={{ marginTop: '1rem' }}>
                      <label className="input-label" style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.85rem', fontWeight: 600 }}>Request Body (JSON)</label>
                      <textarea
                        rows={6}
                        value={apiBody}
                        onChange={(e) => setApiBody(e.target.value)}
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
                      />
                    </div>
                  )}
                </div>

                {/* API Response Display */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="input-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Response Node</label>
                    {apiStatus !== null && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          background: apiStatus < 300 ? 'var(--success-soft)' : 'var(--danger-soft)',
                          color: apiStatus < 300 ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        Status: {apiStatus}
                      </span>
                    )}
                  </div>
                  <textarea
                    readOnly
                    rows={12}
                    value={apiResponse}
                    placeholder="Execute a request to preview response payload..."
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--panel-bg)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </ToolPageShell>
  )
}

export default DeveloperSuite
