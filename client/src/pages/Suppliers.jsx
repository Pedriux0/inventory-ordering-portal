import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Pencil, Plus, Power } from 'lucide-react'
import { Message, PageHeader } from '../components/ui'

const EMPTY_FORM = { supplierName: '', contactEmail: '', contactPhone: '' };

// suppliers page (FE-05, reqs 2.2.5, 2.4.4, 2.5.6)
// everyone can see the list, only Manager and Admin get the buttons
// (hiding buttons is just for a clean screen, the api is what really blocks Staff with a 403)
export default function Suppliers() {
  const { canManageSuppliers } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadSuppliers() {
    try {
      setSuppliers(await api.get('/suppliers'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function openForm(supplier) {
    setEditingId(supplier ? supplier.supplierId : null);
    setForm(
      supplier
        ? {
            supplierName: supplier.supplierName,
            contactEmail: supplier.contactEmail || '',
            contactPhone: supplier.contactPhone || '',
          }
        : EMPTY_FORM
    );
    setError('');
    setSuccess('');
  }

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
        setSuccess(`Supplier "${form.supplierName}" updated.`);
      } else {
        await api.post('/suppliers', form);
        setSuccess(`Supplier "${form.supplierName}" created.`);
      }
      setForm(null);
      loadSuppliers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(supplier) {
    setError('');
    setSuccess('');
    try {
      await api.put(`/suppliers/${supplier.supplierId}/status`, { active: !supplier.isActive });
      setSuccess(`Supplier "${supplier.supplierName}" ${supplier.isActive ? 'deactivated' : 'reactivated'}.`);
      loadSuppliers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Suppliers" description="Companies that deliver your stock.">
        {canManageSuppliers && !form && (
          <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>
            <Plus size={18} aria-hidden="true" /> New supplier
          </button>
        )}
      </PageHeader>

      {!canManageSuppliers && (
        <p className="muted">You can view suppliers. Only Managers and Admins can change them.</p>
      )}
      <Message type="success">{success}</Message>
      {!form && <Message>{error}</Message>}

      {form && (
        <form className="card form" onSubmit={handleSubmit} aria-label="Supplier form">
          <h2>{editingId ? 'Edit supplier' : 'Create new supplier'}</h2>
          <Message>{error}</Message>

          <label htmlFor="supplierName">Supplier name <span className="required">*</span></label>
          <input id="supplierName" name="supplierName" value={form.supplierName} onChange={updateField} maxLength={128} />

          <div className="form-row">
            <div>
              <label htmlFor="contactEmail">Contact email</label>
              <input id="contactEmail" name="contactEmail" type="email" value={form.contactEmail} onChange={updateField} />
            </div>
            <div>
              <label htmlFor="contactPhone">Contact phone</label>
              <input id="contactPhone" name="contactPhone" type="tel" value={form.contactPhone} onChange={updateField} maxLength={20} />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{editingId ? 'Save changes' : 'Create supplier'}</button>
            <button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

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
              <tr key={s.supplierId} className={s.isActive ? '' : 'inactive'}>
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
                        <Power size={14} aria-hidden="true" /> {s.isActive ? 'Deactivate' : 'Reactivate'}<span className="sr-only"> {s.supplierName}</span>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && <p className="empty">No suppliers yet.{canManageSuppliers && ' Add your first one with “New supplier”.'}</p>}
      </section>
    </>
  );
}
