import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ClipboardCheck, LayoutDashboard, LogOut, Package, ShoppingCart, Truck, Warehouse } from 'lucide-react'
import { useAuth } from '../auth'
import { ThemeToggle } from './ui'

// icon + text for every link: icons help recognition, the text keeps them unambiguous
const ICON_SIZE = 20;

// sidebar + top bar around every logged in page (mockup 2)
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logout();
    navigate('/login');
  }

  // "Maria Garcia" -> "MG"
  const initials = user.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <span className="brand-logo">IP</span> Inventory Portal
        </div>

        <NavLink to="/" end><LayoutDashboard size={ICON_SIZE} aria-hidden="true" /> Dashboard</NavLink>
        <NavLink to="/products"><Package size={ICON_SIZE} aria-hidden="true" /> Products</NavLink>
        <NavLink to="/orders"><ShoppingCart size={ICON_SIZE} aria-hidden="true" /> Orders</NavLink>
        <NavLink to="/inventory"><Warehouse size={ICON_SIZE} aria-hidden="true" /> Inventory</NavLink>

        <p className="nav-section">Management</p>
        <NavLink to="/suppliers"><Truck size={ICON_SIZE} aria-hidden="true" /> Suppliers</NavLink>
        <NavLink to="/requests"><ClipboardCheck size={ICON_SIZE} aria-hidden="true" /> Requests</NavLink>

        <div className="nav-bottom">
          <p className="nav-section">Account</p>
          <button type="button" className="nav-button" onClick={handleSignOut}>
            <LogOut size={ICON_SIZE} aria-hidden="true" /> Sign Out
          </button>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <ThemeToggle />
          <div className="user-chip">
            <div>
              <div className="user-name">{user.fullName}</div>
              <div className="user-role" data-cy="user-role">{user.role}</div>
            </div>
            <span className="avatar" aria-hidden="true">{initials}</span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
