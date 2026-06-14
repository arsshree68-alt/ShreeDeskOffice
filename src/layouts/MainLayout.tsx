import { useState, useEffect } from 'react'
import { NavLink, Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import CommandPalette from '../components/CommandPalette'
import DragDropOverlay from '../components/DragDropOverlay'
import SettingsModal from '../components/SettingsModal'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { 
  FiFileText, 
  FiFile, 
  FiImage, 
  FiMonitor, 
  FiBarChart2, 
  FiShield, 
  FiActivity, 
  FiSliders, 
  FiCpu,
  FiEdit3
} from 'react-icons/fi'

const navItems = [
  { label: 'Home / Dashboard', path: '/', icon: <FiActivity /> },
  { label: 'Notes Workspace', path: '/notes', icon: <FiEdit3 /> },
  { label: 'PDF Suite', path: '/pdf', icon: <FiFile /> },
  { label: 'Excel Suite', path: '/excel', icon: <FiBarChart2 /> },
  { label: 'Word Suite', path: '/word', icon: <FiFileText /> },
  { label: 'PowerPoint Suite', path: '/ppt', icon: <FiMonitor /> },
  { label: 'Image Suite', path: '/image', icon: <FiImage /> },
  { label: 'AI Suite', path: '/ai', icon: <FiCpu /> },
  { label: 'Government Suite', path: '/govt', icon: <FiShield /> },
  { label: 'Developer Suite', path: '/developer', icon: <FiSliders /> },
]

const MainLayout = () => {
  const { user, loading } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent-soft)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ fontWeight: 600 }}>Loading ShreeDeskOS Workspace...</span>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />
  }

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!isMobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobileOpen])

  const { toggleTheme } = useTheme()

  // Listen for global command palette keybind (Ctrl + K / Cmd + K) and theme toggle (Ctrl + Shift + L)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsPaletteOpen((prev) => !prev)
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        toggleTheme()
      }
    }
    window.addEventListener('keydown', handleGlobalKeys)
    return () => window.removeEventListener('keydown', handleGlobalKeys)
  }, [toggleTheme])

  const toggleSidebar = () => {
    if (window.innerWidth <= 980) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsCollapsed(!isCollapsed)
    }
  }

  return (
    <div className="layout-shell bg-gradient-premium">
      {/* Global Drag-and-Drop file listener */}
      <DragDropOverlay />

      {/* Global Universal Search (Ctrl+K) */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* Global Settings & API Configuration */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <Header 
        toggleSidebar={toggleSidebar} 
        onSearchClick={() => setIsPaletteOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <div className="layout-body">
        {/* Mobile Overlay */}
        <div
          className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`}
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''} glass`}
          aria-label="Primary navigation sidebar"
          aria-hidden={!isMobileOpen && window.innerWidth <= 980 ? true : undefined}
          style={{ transition: 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.3s ease' }}
        >
          <Link to="/" className="sidebar-brand" style={{ display: isCollapsed ? 'none' : 'block' }}>ShreeDeskOS</Link>
          <p className="sidebar-tagline" style={{ display: isCollapsed ? 'none' : 'block' }}>The Productivity Workspace</p>
          <nav className="nav-panel" aria-label="Primary navigation">
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink to={item.path} end={item.path === '/'} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} title={item.label}>
                    <span className="nav-icon" aria-hidden="true" style={{ fontSize: '1.1rem', marginRight: isCollapsed ? '0' : '0.5rem' }}>{item.icon}</span>
                    <span className="nav-label" style={{ display: isCollapsed ? 'none' : 'inline' }}>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main 
          className="content-area" 
          style={{ 
            marginLeft: isCollapsed ? '80px' : '260px', 
            transition: 'margin-left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
          }}
        >
          <div className="content-wrap">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
