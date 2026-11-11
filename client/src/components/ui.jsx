import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, CircleAlert, Moon, Search, Sun, TriangleAlert, X } from 'lucide-react'
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

// label + input + hint + error, all wired together for screen readers
// (docs/UI_RESEARCH.md section F: errors go right under the field, not only at the top)
// children is a function that gets the props the input needs:
//   <Field id="unitPrice" label="Unit price" error={errors.unitPrice}>
//     {(props) => <input {...props} type="number" />}
//   </Field>
export function Field({ id, label, required, error, hint, children }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={error ? 'field field-invalid' : 'field'}>
      <label htmlFor={id}>
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
      </label>
      {children({
        id,
        name: id,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
        'aria-describedby': describedBy,
      })}
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          <CircleAlert size={14} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

// after a failed submit, move focus to the first field with an error
export function focusFirstError(form) {
  const invalid = form && form.querySelector('[aria-invalid="true"]');
  if (invalid) invalid.focus();
}

// stock level as a bar (docs/UI_RESEARCH.md section D)
// NN/G: length is the fastest way for people to compare amounts. The thin line marks the
// reorder level, so you can see at a glance how close a product is to running out.
// it is decorative (aria-hidden) because the exact numbers are always written next to it
export function StockBar({ currentStock, reorderLevel }) {
  const scale = Math.max(reorderLevel * 3, currentStock, 1);
  const fill = Math.min(100, (currentStock / scale) * 100);
  const marker = (reorderLevel / scale) * 100;
  let level = 'ok';
  if (currentStock <= reorderLevel / 2) level = 'critical';
  else if (currentStock <= reorderLevel) level = 'low';

  return (
    <div className={`stockbar stockbar-${level}`} aria-hidden="true">
      <div className="stockbar-fill" style={{ width: `${fill}%` }} />
      {reorderLevel > 0 && <div className="stockbar-marker" style={{ left: `${marker}%` }} />}
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

// ---------- week 7: search, sort and pages (reqs 2.6.1 - 2.6.4) ----------

// search box + the active search shown as a chip you can remove (mockup 7)
// the search only runs on Enter / the button, so the list does not jump around while typing
export function SearchBar({ id, label, placeholder, value, onChange, onSubmit, active, total, onClear }) {
  return (
    <div className="search-area">
      <form className="search-bar" role="search" onSubmit={onSubmit} aria-label={label}>
        <label htmlFor={id} className="sr-only">{label}</label>
        <div className="search-input">
          <Search size={16} aria-hidden="true" className="search-icon" />
          <input id={id} type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
        <button type="submit" className="btn">Search</button>
      </form>
      {active && (
        <p className="chips">
          <span className="chip">
            Search: “{active}”
            <button type="button" onClick={onClear} aria-label={`Remove search ${active}`}>
              <X size={14} aria-hidden="true" />
            </button>
          </span>
          {total !== undefined && <span className="muted small">{total} found</span>}
        </p>
      )}
    </div>
  );
}

// a column header you can click to sort by (req 2.6.3); aria-sort tells screen readers the order
export function SortHeader({ column, label, sort, order, onSort, className = '' }) {
  const active = sort === column;
  const ariaSort = active ? (order === 'asc' ? 'ascending' : 'descending') : 'none';
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={className} aria-sort={ariaSort}>
      <button type="button" className={active ? 'sort-button sort-active' : 'sort-button'} onClick={() => onSort(column)}>
        {label}
        <Icon size={13} aria-hidden="true" />
      </button>
    </th>
  );
}

// page controls under a long list (req 2.6.4, 25 per page): "Showing 26-50 of 60" + previous / next
export function Pagination({ page, pageSize, total, onPage, label }) {
  if (total <= pageSize) return null; // everything fits on one page
  const pages = Math.ceil(total / pageSize);
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav className="pagination" aria-label={label}>
      <span aria-live="polite">
        Showing {first}-{last} of {total} · page {page} of {pages}
      </span>
      <div className="actions">
        <button type="button" className="btn btn-small" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={14} aria-hidden="true" /> Previous<span className="sr-only"> page</span>
        </button>
        <button type="button" className="btn btn-small" onClick={() => onPage(page + 1)} disabled={page >= pages}>
          Next<span className="sr-only"> page</span> <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
