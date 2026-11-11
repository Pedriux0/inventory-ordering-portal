import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../auth'

// 403 page (mockup 5, reqs 3.1.4 and 3.2.1): shown when someone opens a page their role
// cannot use. A clear message without any internal details, plus a reference the
// administrator can use (the attempt is also in the audit log when the api is called)
export default function AccessDenied() {
  const { user } = useAuth();
  const reference = `403-${new Date().toISOString().slice(0, 16).replace(/\D/g, '')}`;
  return (
    <section className="card access-denied" aria-labelledby="denied-title">
      <ShieldAlert size={44} aria-hidden="true" className="denied-icon" />
      <h1 id="denied-title">Access denied</h1>
      <p>
        Your role (<strong>{user.role}</strong>) does not have permission to open this page. If you
        need access, ask an administrator.
      </p>
      <p className="muted small">Error 403 · reference {reference}</p>
      <Link className="btn btn-primary" to="/">Back to the dashboard</Link>
    </section>
  );
}
