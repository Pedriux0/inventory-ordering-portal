import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

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

        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/orders">Orders</NavLink>
        <NavLink to="/inventory">Inventory</NavLink>

        <p className="nav-section">Management</p>
        <NavLink to="/suppliers">Suppliers</NavLink>
        <NavLink to="/requests">Requests</NavLink>

        <p className="nav-section">Account</p>
        <button type="button" className="nav-button" onClick={handleSignOut}>
          Sign Out
        </button>
      </nav>

      <div className="main">
        <header className="topbar">
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
