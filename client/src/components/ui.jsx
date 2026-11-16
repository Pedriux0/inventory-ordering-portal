// small pieces reused by several pages

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

// colored stock label like the dashboard mockup: Critical / Low / OK
export function StockBadge({ currentStock, reorderLevel }) {
  let label = 'OK';
  let kind = 'ok';
  if (currentStock <= reorderLevel / 2) {
    label = 'Critical';
    kind = 'critical';
  } else if (currentStock <= reorderLevel) {
    label = 'Low';
    kind = 'low';
  }
  return <span className={`badge badge-${kind}`}>{label}</span>;
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

// page controls under a long list (req 2.6.4, 25 per page): "Showing 26-50 of 60" + previous / next
export function Pagination({ page, pageSize, total, onPage, label }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null; // everything fits on one page
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav className="pagination" aria-label={label}>
      <span aria-live="polite">
        Showing {first}-{last} of {total} · page {page} of {pages}
      </span>
      <div className="actions">
        <button type="button" className="btn btn-small" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          Previous<span className="sr-only"> page</span>
        </button>
        <button type="button" className="btn btn-small" onClick={() => onPage(page + 1)} disabled={page >= pages}>
          Next<span className="sr-only"> page</span>
        </button>
      </div>
    </nav>
  );
}

// a column header you can click to sort by (req 2.6.3); aria-sort tells screen readers the order
export function SortHeader({ column, label, sort, order, onSort, className = '' }) {
  const active = sort === column;
  const ariaSort = active ? (order === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th className={className} aria-sort={ariaSort}>
      <button type="button" className="sort-button" onClick={() => onSort(column)}>
        {label}
        <span aria-hidden="true" className="sort-arrow">{active ? (order === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</span>
      </button>
    </th>
  );
}
