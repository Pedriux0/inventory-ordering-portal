import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Power } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth'
import Drawer from '../components/Drawer'
import { useToast } from '../components/Toast'
import { Field, Message, PageHeader, focusFirstError } from '../components/ui'
import { hasErrors, supplierErrors } from '../validation'

const EMPTY_FORM = { supplierName: '', contactEmail: '', contactPhone: '' };

// suppliers page (FE-05, reqs 2.2.5, 2.4.4, 2.5.6)
// everyone can see the list, only Manager and Admin get the buttons
// (hiding buttons is just for a clean screen, the api is what really blocks Staff with a 403)
export default function Suppliers() {
  const { canManageSuppliers } = useAuth();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, 'new' or a supplier
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const formRef = useRef(null);

  async function loadSuppliers() {
    try {
      setSuppliers(await api.get('/suppliers'));
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function openForm(supplier) {
    setEditing(supplier || 'new');
    setForm(
      supplier
        ? {
            supplierName: supplier.supplierName,
            contactEmail: supplier.contactEmail || '',
            contactPhone: supplier.contactPhone || '',
          }
        : EMPTY_FORM
    );
    setErrors({});
    setServerError('');
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors(supplierErrors({ ...form, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = supplierErrors(form);
    setErrors(found);
    setServerError('');
    if (hasErrors(found)) {
      setTimeout(() => focusFirstError(formRef.current));
      return;
    }

    try {
      if (editing === 'new') {
        await api.post('/suppliers', form);
        toast(`Supplier "${form.supplierName.trim()}" created.`);
      } else {
        await api.put(`/suppliers/${editing.supplierId}`, form);
        toast(`Supplier "${form.supplierName.trim()}" updated.`);
      }
      setEditing(null);
      loadSuppliers();
    } catch (err) {
      setServerError(err.message);
    }
  }

  async function setActive(supplier, active) {
    await api.put(`/suppliers/${supplier.supplierId}/status`, { active });
    loadSuppliers();
  }

  // deactivating is the risky action, so instead of an "are you sure?" box
  // it happens right away with an Undo button (faster, and nothing is lost)
  async function toggleActive(supplier) {
    setActionError('');
    try {
      if (supplier.isActive) {
        await setActive(supplier, false);
        toast(`Supplier "${supplier.supplierName}" deactivated.`, {
          action: { label: 'Undo', onClick: () => setActive(supplier, true).catch((err) => setActionError(err.message)) },
        });
      } else {
        await setActive(supplier, true);
        toast(`Supplier "${supplier.supplierName}" reactivated.`);
      }
    } catch (err) {
      setActionError(err.message);
    }
  }

  const activeCount = suppliers.filter((s) => s.isActive).length;

  return (
    <>
      <PageHeader
        title="Suppliers"
        description={
          canManageSuppliers
            ? `${activeCount} active suppliers`
            : `${activeCount} active suppliers · only Managers and Admins can change them`
        }
      >
        {canManageSuppliers && (
          <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>
            <Plus size={18} aria-hidden="true" /> New supplier
          </button>
        )}
      </PageHeader>

      <Message>{loadError || actionError}</Message>

      <section className="card card-flush">
        <table>
          <thead>
            <tr>
              <th>Supplier</th><th>Email</th><th>Phone</th><th>Status</th>
              {canManageSuppliers && <th><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.supplierId} className={[s.isActive ? '' : 'inactive', editing && editing.supplierId === s.supplierId ? 'selected' : ''].join(' ').trim()}>
                <td>
                  <div className="cell-title">{s.supplierName}</div>
                  <div className="cell-sub">#{s.supplierId}</div>
                </td>
                <td>{s.contactEmail || '—'}</td>
                <td>{s.contactPhone || '—'}</td>
                {/* only the unusual state gets a badge, "Active" stays quiet */}
                <td>
                  {s.isActive ? <span className="muted">Active</span> : <span className="badge badge-muted">Inactive</span>}
                </td>
                {canManageSuppliers && (
                  <td>
                    <div className="actions">
                      <button type="button" className="btn btn-small" onClick={() => openForm(s)}>
                        <Pencil size={14} aria-hidden="true" /> Edit<span className="sr-only"> {s.supplierName}</span>
                      </button>
                      <button type="button" className="btn btn-small" onClick={() => toggleActive(s)}>
                        <Power size={14} aria-hidden="true" /> {s.isActive ? 'Deactivate' : 'Reactivate'}
                        <span className="sr-only"> {s.supplierName}</span>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && !loadError && (
          <p className="empty">No suppliers yet.{canManageSuppliers && ' Add your first one with “New supplier”.'}</p>
        )}
      </section>

      {editing && (
        <Drawer title={editing === 'new' ? 'New supplier' : `Edit ${editing.supplierName}`} onClose={() => setEditing(null)}>
          <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label="Supplier form" className="drawer-form">
            <Message>{serverError}</Message>

            <Field id="supplierName" label="Supplier name" required error={errors.supplierName}>
              {(props) => <input {...props} value={form.supplierName} onChange={updateField} maxLength={128} />}
            </Field>
            <Field id="contactEmail" label="Contact email" error={errors.contactEmail}>
              {(props) => <input {...props} type="email" autoComplete="off" value={form.contactEmail} onChange={updateField} />}
            </Field>
            <Field id="contactPhone" label="Contact phone" error={errors.contactPhone}>
              {(props) => <input {...props} type="tel" value={form.contactPhone} onChange={updateField} maxLength={20} />}
            </Field>

            <div className="drawer-footer">
              <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing === 'new' ? 'Create supplier' : 'Save changes'}</button>
            </div>
          </form>
        </Drawer>
      )}
    </>
  );
}
