import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'

/* ── Suite pages (launchers & workspaces) ────────────────────────── */
const DashboardPage  = lazy(() => import('../pages/dashboard/Dashboard'))
const PdfPage        = lazy(() => import('../pages/pdf/PdfPage'))
const ExcelPage      = lazy(() => import('../pages/excel/ExcelPage'))
const WordPage       = lazy(() => import('../pages/word/WordPage'))

/* ── New Workspaces ──────────────────────────────────────────────── */
const ImageSuitePages = lazy(() => import('../pages/image/ImageSuitePages'))
const AiWorkspace     = lazy(() => import('../pages/ai/AiWorkspace'))
const GovSuitePages   = lazy(() => import('../pages/govt/GovSuitePages'))
const DeveloperSuite  = lazy(() => import('../pages/developer/DeveloperSuite'))
const PptSuitePages   = lazy(() => import('../pages/ppt/PptSuitePages'))
const NotesPage       = lazy(() => import('../pages/notes/NotesPage'))
const LoginPage       = lazy(() => import('../pages/auth/LoginPage'))

/* ── PDF tool pages ───────────────────────────────────────────────── */
const PdfToolPage = lazy(() => import('../pages/pdf/tools/PdfToolPage'))

/* ── Excel tool pages ─────────────────────────────────────────────── */
const ExcelToolPage = lazy(() => import('../pages/excel/tools/ExcelToolPage'))

/* ── Shared loading fallback ──────────────────────────────────────── */
const Loading = ({ label = 'Loading ShreeDeskOS Workspace…' }: { label?: string }) => (
  <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'var(--bg)', minHeight: '100vh' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent-soft)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{label}</span>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
)

const S = (C: React.ComponentType, label?: string) => (
  <Suspense fallback={<Loading label={label} />}>
    <C />
  </Suspense>
)

const AppRoutes = () => (
  <Routes>
    {/* Login page is standalone — no sidebar/header layout */}
    <Route path="/login" element={<Suspense fallback={<Loading label="Loading Login screen…" />}><LoginPage /></Suspense>} />

    {/* All main workspace routes use MainLayout (no forced auth guard) */}
    <Route path="/" element={<MainLayout />}>
      {/* Dashboard */}
      <Route index element={S(DashboardPage)} />

      {/* PDF Suite */}
      <Route path="pdf" element={S(PdfPage, 'Loading PDF Suite…')} />
      <Route path="pdf/:toolId" element={S(PdfToolPage, 'Loading PDF Tool…')} />

      {/* Excel Suite */}
      <Route path="excel" element={S(ExcelPage, 'Loading Excel Suite…')} />
      <Route path="excel/:toolId" element={S(ExcelToolPage, 'Loading Excel Tool…')} />

      {/* Word Suite */}
      <Route path="word"  element={S(WordPage, 'Loading Word Workspace…')} />
      <Route path="word/*" element={S(WordPage, 'Loading Word Workspace…')} />

      {/* PowerPoint Suite */}
      <Route path="ppt"   element={S(PptSuitePages, 'Loading Presentation Suite…')} />
      <Route path="ppt/*" element={S(PptSuitePages, 'Loading Presentation Suite…')} />

      {/* Image Suite */}
      <Route path="image" element={S(ImageSuitePages, 'Loading Image Suite…')} />
      <Route path="image/*" element={S(ImageSuitePages, 'Loading Image Suite…')} />

      {/* AI Suite */}
      <Route path="ai" element={S(AiWorkspace, 'Loading AI Workspace…')} />
      <Route path="ai/*" element={S(AiWorkspace, 'Loading AI Workspace…')} />

      {/* Government Suite */}
      <Route path="govt" element={S(GovSuitePages, 'Loading Government Suite…')} />
      <Route path="govt/*" element={S(GovSuitePages, 'Loading Government Suite…')} />

      {/* Developer Suite */}
      <Route path="developer" element={S(DeveloperSuite, 'Loading Developer Suite…')} />
      <Route path="developer/*" element={S(DeveloperSuite, 'Loading Developer Suite…')} />

      {/* Notes Suite */}
      <Route path="notes" element={S(NotesPage, 'Loading Notes Workspace…')} />

      {/* Fallback — redirect to dashboard */}
      <Route path="*" element={S(DashboardPage)} />
    </Route>
  </Routes>
)

export default AppRoutes
