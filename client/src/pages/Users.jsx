import { useEffect, useRef, useState } from 'react'
import { Plus, UserRoundCheck, UserRoundX } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth'
import Drawer from '../components/Drawer'
import { useToast } from '../components/Toast'
import { Field, Message, PageHeader, focusFirstError } from '../components/ui'
import { useSaving } from '../hooks'
import { hasErrors, userErrors } from '../validation'

const ROLES = ['Staff', 'Manager', 'Admin'];
const EMPTY_FORM = { fullName: '', email: '', password: '', role: 'Staff' };

// users page, Admin only (reqs 2.2.6, 2.3.4, 2.5.7)
// create accounts in a side panel, assign roles (FE-06), deactivate / reactivate (FE-15)
// the api checks the Admin role on every call; this page is only the screen for it
export default function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, guard] = useSaving();
  const formRef = useRef(null);

  async function loadUsers() {
    try {
      setUsers(await api.get('/users'));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setServerError('');
    setCreating(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors(userErrors({ ...form, [name]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    const found = userErrors(form);
    setErrors(found);
    setServerError('');
    if (hasErrors(found)) {
      setTimeout(() => focusFirstError(formRef.current));
      return;
    }
    await guard(async () => {
      try {
        const created = await api.post('/users', form);
        toast(`Account for ${created.fullName} created (${created.role}).`);
        setCreating(false);
        loadUsers();
      } catch (err) {
        setServerError(err.message); // e.g. email already in use
      }
    });
  }

  // FE-06: assign a role (req 2.5.7)
  async function changeRole(account, role) {
    setLoadError('');
    await guard(async () => {
      try {
        await api.put(`/users/${account.userId}/role`, { role });
        toast(`${account.fullName} is now ${role}.`);
        loadUsers();
      } catch (err) {
        setLoadError(err.message);
      }
    });
  }

  // FE-15: deactivate / reactivate (req 2.3.4), a deactivated account cannot log in
  async function setActive(account, active) {
    setLoadError('');
    await guard(async () => {
      try {
        await api.put(`/users/${account.userId}/status`, { active });
        toast(`${account.fullName} ${active ? 'reactivated' : 'deactivated'}.`, {
          // a mistake is one click to undo, instead of a "are you sure?" box every time
          action: { label: 'Undo', onClick: () => setActive(account, !active) },
        });
        loadUsers();
      } catch (err) {
        setLoadError(err.message);
      }
    });
  }

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <>
      <PageHeader title="Users" description={loaded ? `${users.length} accounts · ${activeCount} active` : 'Loading...'}>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} aria-hidden="true" /> New account
        </button>
      </PageHeader>

      <Message>{loadError}</Message>

      <section className="card card-flush">
        <table className="responsive">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Status</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map((account) => {
              const isMe = account.userId === user.userId; // you cannot lock yourself out
              return (
                <tr key={account.userId} className={account.isActive ? '' : 'inactive'}>
                  <td>
                    <div className="cell-title">
                      {account.fullName}
                      {isMe && <span className="muted small"> (you)</span>}
                    </div>
                    <div className="cell-sub">{account.email}</div>
                  </td>
                  <td data-label="Role">
                    <label className="sr-only" htmlFor={`role-${account.userId}`}>Role of {account.fullName}</label>
                    <select
                      id={`role-${account.userId}`}
                      className="select-compact"
                      value={account.role}
                      disabled={isMe || saving}
                      onChange={(e) => changeRole(account, e.target.value)}
                    >
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${account.isActive ? 'badge-success' : 'badge-muted'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      {!isMe && (
                        <button type="button" className="btn btn-small" onClick={() => setActive(account, !account.isActive)} disabled={saving}>
                          {account.isActive ? <UserRoundX size={14} aria-hidden="true" /> : <UserRoundCheck size={14} aria-hidden="true" />}
                          {account.isActive ? 'Deactivate' : 'Reactivate'}<span className="sr-only"> {account.fullName}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loaded && <p className="empty" role="status">Loading accounts...</p>}
      </section>

      {creating && (
        <Drawer title="New account" onClose={() => setCreating(false)}>
          <form ref={formRef} onSubmit={handleCreate} noValidate aria-label="New account" className="drawer-form">
            <Message>{serverError}</Message>
            <Field id="fullName" label="Full name" required error={errors.fullName}>
              {(props) => <input {...props} value={form.fullName} onChange={updateField} maxLength={128} autoComplete="off" />}
            </Field>
            <Field id="email" label="Email" required error={errors.email}>
              {(props) => <input {...props} type="email" value={form.email} onChange={updateField} autoComplete="off" />}
            </Field>
            <Field id="password" label="Temporary password" required error={errors.password} hint="At least 16 characters, with upper case, lower case and a number.">
              {(props) => <input {...props} type="password" autoComplete="new-password" value={form.password} onChange={updateField} />}
            </Field>
            <Field id="role" label="Role" hint="Staff: daily work · Manager: approvals and suppliers · Admin: accounts too">
              {(props) => (
                <select {...props} value={form.role} onChange={updateField}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              )}
            </Field>
            <div className="drawer-footer">
              <button type="button" className="btn" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create account'}</button>
            </div>
          </form>
        </Drawer>
      )}
    </>
  );
}
