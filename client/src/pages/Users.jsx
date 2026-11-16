import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Message } from '../components/ui'
import { useSaving } from '../hooks'

const ROLES = ['Staff', 'Manager', 'Admin'];
const EMPTY_FORM = { fullName: '', email: '', password: '', role: 'Staff' };

// users page, Admin only (reqs 2.2.6, 2.3.4, 2.5.7)
// create accounts, assign roles (FE-06), deactivate / reactivate (FE-15)
// the api checks the Admin role on every call; this page is only the screen for it
export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(null); // null = create form closed
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, guard] = useSaving();

  async function loadUsers() {
    try {
      setUsers(await api.get('/users'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    await guard(async () => {
      try {
        const created = await api.post('/users', form);
        setSuccess(`Account for ${created.fullName} created (${created.role}).`);
        setForm(null);
        loadUsers();
      } catch (err) {
        setError(err.message); // e.g. password rules, email already in use
      }
    });
  }

  // FE-06: assign a role (req 2.5.7)
  async function changeRole(account, role) {
    setError('');
    setSuccess('');
    await guard(async () => {
      try {
        await api.put(`/users/${account.userId}/role`, { role });
        setSuccess(`${account.fullName} is now ${role}.`);
        loadUsers();
      } catch (err) {
        setError(err.message);
      }
    });
  }

  // FE-15: deactivate / reactivate (req 2.3.4), a deactivated account cannot log in
  async function toggleActive(account) {
    setError('');
    setSuccess('');
    await guard(async () => {
      try {
        await api.put(`/users/${account.userId}/status`, { active: !account.isActive });
        setSuccess(`${account.fullName} ${account.isActive ? 'deactivated' : 'reactivated'}.`);
        loadUsers();
      } catch (err) {
        setError(err.message);
      }
    });
  }

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
        {!form && (
          <button type="button" className="btn btn-primary" onClick={() => setForm(EMPTY_FORM)}>
            + New account
          </button>
        )}
      </div>

      <Message type="success">{success}</Message>
      {!form && <Message>{error}</Message>}

      {form && (
        <form className="card form" onSubmit={handleCreate} aria-label="New account">
          <h2>Create account</h2>
          <Message>{error}</Message>
          <div className="form-row">
            <div>
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" value={form.fullName} onChange={updateField} maxLength={128} required />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={updateField} required />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label htmlFor="password">Temporary password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={updateField} required />
              <p className="hint">At least 16 characters, with upper case, lower case and a number.</p>
            </div>
            <div>
              <label htmlFor="role">Role</label>
              <select id="role" name="role" value={form.role} onChange={updateField}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create account'}</button>
            <button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <section className="card">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {users.map((account) => {
              const isMe = account.userId === user.userId; // you cannot lock yourself out
              return (
                <tr key={account.userId} className={account.isActive ? '' : 'inactive'}>
                  <td>
                    {account.fullName}
                    {isMe && <span className="muted small"> (you)</span>}
                  </td>
                  <td>{account.email}</td>
                  <td>
                    <label className="sr-only" htmlFor={`role-${account.userId}`}>Role of {account.fullName}</label>
                    <select
                      id={`role-${account.userId}`}
                      value={account.role}
                      disabled={isMe || saving}
                      onChange={(e) => changeRole(account, e.target.value)}
                    >
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${account.isActive ? 'badge-ok' : 'badge-muted'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {!isMe && (
                      <button type="button" className="btn btn-small" onClick={() => toggleActive(account)} disabled={saving}>
                        {account.isActive ? 'Deactivate' : 'Reactivate'}<span className="sr-only"> {account.fullName}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loaded && <p className="muted" role="status">Loading accounts...</p>}
      </section>
    </>
  );
}
