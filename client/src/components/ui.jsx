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
