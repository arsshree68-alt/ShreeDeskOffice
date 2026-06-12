import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'PDF Suite', path: '/pdf' },
  { label: 'Excel Suite', path: '/excel' },
  { label: 'Word Suite', path: '/word' },
  { label: 'PowerPoint Suite', path: '/ppt' },
  { label: 'Image Suite', path: '/image' },
  { label: 'Data Processing', path: '/data' },
  { label: 'Statistical Lab', path: '/stats' },
  { label: 'Government Suite', path: '/govt' },
]

const MainLayout = () => (
  <div className="layout-shell">
    <aside className="sidebar">
      <div className="sidebar-brand">ShreeDeskOffice</div>
      <p className="sidebar-tagline">Documents · Data · Decisions</p>
      <nav className="nav-panel" aria-label="Primary navigation">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>

    <main className="content-area">
      <div className="content-wrap">
        <Outlet />
      </div>
    </main>
  </div>
)

export default MainLayout
