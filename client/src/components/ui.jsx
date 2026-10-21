import { useState } from 'react'
import { CircleAlert, Moon, Sun, TriangleAlert } from 'lucide-react'
import { getTheme, setTheme } from '../theme'

// small pieces reused by several pages

// page title + optional description + the ONE primary action of the page
export function PageHeader({ title, description, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// error / success message box
// role="alert" makes screen readers announce errors right away, role="status" is polite
export function Message({ type = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`message message-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

// stock status: only problems get a badge (Low / Critical), a healthy product shows nothing
// text + icon + color together, so it never depends on color alone (WCAG 1.4.1)
export function StockBadge({ currentStock, reorderLevel }) {
  if (currentStock <= reorderLevel / 2) {
    return (
      <span className="badge badge-critical">
        <TriangleAlert size={13} aria-hidden="true" /> Critical
      </span>
    );
  }
  if (currentStock <= reorderLevel) {
    return (
      <span className="badge badge-low">
        <CircleAlert size={13} aria-hidden="true" /> Low
      </span>
    );
  }
  return <span className="sr-only">In stock</span>;
}

// summary number card for the dashboard
export function StatCard({ label, value, note }) {
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

// light / dark switch, the label says what clicking will do
export function ThemeToggle({ className = '' }) {
  const [theme, setThemeState] = useState(getTheme);
  const next = theme === 'dark' ? 'light' : 'dark';

  function toggle() {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
