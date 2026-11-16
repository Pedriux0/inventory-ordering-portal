import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

// 403 page (mockup 5, reqs 3.1.4 and 3.2.1): shown when someone opens a page their role
// cannot use. A clear message without any internal details, plus a reference the
// administrator can use (the attempt is also in the audit log when the api is called)
export default function AccessDenied() {
  const { user } = useAuth();
  const reference = `403-${new Date().toISOString().slice(0, 16).replace(/\D/g, '')}`;
  return (
    <section className="card access-denied" aria-labelledby="denied-title">
      <p className="denied-code" aria-hidden="true">403</p>
      <h1 id="denied-title">Access denied</h1>
      <p>
        Your role (<strong>{user.role}</strong>) does not have permission to open this page. If you
        need access, ask an administrator.
      </p>
      <p className="muted small">Reference: {reference}</p>
      <Link className="btn btn-primary" to="/">Back to the dashboard</Link>
    </section>
  );
}
