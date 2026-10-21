import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, CircleCheck, CircleX, Clock, Plus, X } from 'lucide-react'
import { api, displayDate } from '../api'
import { useAuth } from '../auth'
import Drawer from '../components/Drawer'
import ProductPicker from '../components/ProductPicker'
import { useToast } from '../components/Toast'
import { Field, Message, PageHeader, focusFirstError } from '../components/ui'
import { useSaving } from '../hooks'
import { declineErrors, hasErrors, requestErrors } from '../validation'

const emptyRequest = (productId = '') => ({ productId, supplierId: '', quantity: '', note: '' });

// status shown with an icon + word + color (never color alone, WCAG 1.4.1)
function StatusBadge({ status }) {
  if (status === 'Approved') {
    return <span className="badge badge-success"><CircleCheck size={13} aria-hidden="true" /> Approved</span>;
  }
  if (status === 'Declined') {
    return <span className="badge badge-critical"><CircleX size={13} aria-hidden="true" /> Declined</span>;
  }
  return <span className="badge badge-low"><Clock size={13} aria-hidden="true" /> Pending</span>;
}

// purchase requests (req 2.2.5, "inventory approval")
// Staff ask for products to be ordered from a supplier, a Manager or Admin approves or declines.
// Managers and Admins dont need approval: their requests are approved straight away.
// /requests?product=5 opens a new request with product 5 already chosen (from the dashboard)
export default function Requests() {
  const { user, canManageSuppliers: canApprove } = useAuth(); // same roles: Manager and Admin
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, guard] = useSaving();

  // new request panel
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyRequest());
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const formRef = useRef(null);

  // decline panel
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const showAll = searchParams.get('show') === 'all';

  async function loadAll() {
    try {
      const [requestList, productList, supplierList] = await Promise.all([
        api.get('/purchase-requests'),
        api.get('/products'),
        api.get('/suppliers'),
      ]);
      setRequests(requestList);
      setProducts(productList);
      setSuppliers(supplierList.filter((s) => s.isActive)); // only active suppliers can be ordered from
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate(productId = '') {
    setForm(emptyRequest(productId));
    setErrors({});
    setServerError('');
    setCreating(true);
  }

  // coming from the dashboard: ?product=<id> opens the panel with that product chosen
  useEffect(() => {
    const product = searchParams.get('product');
    if (product && products.length > 0) {
      const id = Number(product);
      openCreate(products.some((p) => p.productId === id) ? id : '');
      const rest = new URLSearchParams(searchParams);
      rest.delete('product');
      setSearchParams(rest, { replace: true });
    }
  }, [searchParams, products]);

  function updateField(name, value) {
    const next = { ...form, [name]: value };
    setForm(next);
    if (errors[name]) setErrors(requestErrors(next));
  }

  async function handleCreate(event) {
    event.preventDefault();
    const found = requestErrors(form);
    setErrors(found);
    setServerError('');
    if (hasErrors(found)) {
      setTimeout(() => focusFirstError(formRef.current));
      return;
    }
    await guard(async () => {
      try {
        const created = await api.post('/purchase-requests', {
          productId: Number(form.productId),
          supplierId: Number(form.supplierId),
          quantity: Number(form.quantity),
          note: form.note,
        });
        toast(
          created.status === 'Approved'
            ? `Request for ${created.quantity} × ${created.productName} approved.`
            : `Request for ${created.quantity} × ${created.productName} sent for approval.`
        );
        setCreating(false);
        loadAll();
      } catch (err) {
        setServerError(err.message);
      }
    });
  }

  async function approve(request) {
    setActionError('');
    await guard(async () => {
      try {
        await api.put(`/purchase-requests/${request.requestId}/decision`, { decision: 'Approved' });
        toast(`Request #${request.requestId} approved: ${request.quantity} × ${request.productName}.`);
        loadAll();
      } catch (err) {
        setActionError(err.message); // e.g. another manager decided it a second ago
        loadAll();
      }
    });
  }

  function openDecline(request) {
    setDeclining(request);
    setReason('');
    setReasonError('');
  }

  async function confirmDecline(event) {
    event.preventDefault();
    const found = declineErrors(reason);
    setReasonError(found.reason || '');
    if (hasErrors(found)) {
      setTimeout(() => document.getElementById('reason')?.focus());
      return;
    }
    await guard(async () => {
      try {
        await api.put(`/purchase-requests/${declining.requestId}/decision`, { decision: 'Declined', note: reason });
        toast(`Request #${declining.requestId} declined.`);
        setDeclining(null);
        loadAll();
      } catch (err) {
        setReasonError(err.message);
      }
    });
  }

  const pending = requests.filter((r) => r.status === 'Pending');
  const visible = showAll ? requests : pending;
  const chosen = products.find((p) => p.productId === Number(form.productId));

  return (
    <>
      <PageHeader
        title="Purchase requests"
        description={
          canApprove
            ? `${pending.length} waiting for approval · as a ${user.role}, your own requests are approved right away`
            : `${pending.length} waiting for approval · a Manager approves or declines each request`
        }
      >
        <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
          <Plus size={18} aria-hidden="true" /> {canApprove ? 'Order products' : 'New request'}
        </button>
      </PageHeader>

      <Message>{loadError || actionError}</Message>

      <section className="card card-flush">
        <div className="card-header card-header-pad">
          <h2>{showAll ? 'All requests' : 'Waiting for approval'}</h2>
          <div className="segmented" role="group" aria-label="Filter requests">
            <button type="button" aria-pressed={!showAll} onClick={() => setSearchParams({}, { replace: true })}>
              Waiting <span className="count">{pending.length}</span>
            </button>
            <button type="button" aria-pressed={showAll} onClick={() => setSearchParams({ show: 'all' }, { replace: true })}>
              All <span className="count">{requests.length}</span>
            </button>
          </div>
        </div>
        {!loaded ? (
          <p className="empty" role="status">Loading requests...</p>
        ) : visible.length === 0 ? (
          <p className="empty">
            {showAll ? 'No requests yet.' : 'Nothing is waiting for approval.'}
          </p>
        ) : (
          <table className="responsive">
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Qty</th>
                <th>Supplier</th>
                <th>Requested by</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.requestId} className={declining && declining.requestId === r.requestId ? 'selected' : ''}>
                  <td>
                    <div className="cell-title">{r.productName}</div>
                    <div className="cell-sub">
                      Request #{r.requestId}
                      {r.note && ` · “${r.note}”`}
                    </div>
                  </td>
                  <td className="num" data-label="Qty">{r.quantity}</td>
                  <td data-label="Supplier">{r.supplierName}</td>
                  <td data-label="Requested by">
                    <div>{r.requestedBy}</div>
                    <div className="cell-sub">{displayDate(r.createdAt)}</div>
                  </td>
                  <td data-label="Status">
                    <div>
                      <StatusBadge status={r.status} />
                      {r.status !== 'Pending' && (
                        <div className="decision-note">
                          {r.status === 'Declined' && r.decisionNote ? `“${r.decisionNote}” · ` : ''}
                          by {r.decidedBy}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {canApprove && r.status === 'Pending' && (
                      <div className="actions">
                        <button type="button" className="btn btn-small btn-primary" onClick={() => approve(r)} disabled={saving}>
                          <Check size={14} aria-hidden="true" /> Approve<span className="sr-only"> request {r.requestId}</span>
                        </button>
                        <button type="button" className="btn btn-small" onClick={() => openDecline(r)} disabled={saving}>
                          <X size={14} aria-hidden="true" /> Decline<span className="sr-only"> request {r.requestId}</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {creating && (
        <Drawer title={canApprove ? 'Order products' : 'New purchase request'} onClose={() => setCreating(false)}>
          <form ref={formRef} onSubmit={handleCreate} noValidate aria-label="New purchase request" className="drawer-form">
            <p className="muted small">
              {canApprove
                ? `As a ${user.role}, this is approved right away.`
                : 'A Manager will approve or decline it. Stock goes up when the delivery is received.'}
            </p>
            <Message>{serverError}</Message>

            <Field id="productId" label="Product" required error={errors.productId}>
              {(props) => (
                <ProductPicker {...props} products={products} value={form.productId} onChange={(id) => updateField('productId', id)} />
              )}
            </Field>
            <Field id="supplierId" label="Supplier" required error={errors.supplierId}>
              {(props) => (
                <select {...props} value={form.supplierId} onChange={(e) => updateField('supplierId', e.target.value)}>
                  <option value="">Choose a supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field
              id="quantity"
              label="Quantity"
              required
              error={errors.quantity}
              hint={chosen ? `${chosen.currentStock} in stock now, reorder level ${chosen.reorderLevel}` : null}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                  data-autofocus={form.productId ? true : undefined}
                />
              )}
            </Field>
            <Field id="note" label="Note (optional)" error={errors.note}>
              {(props) => (
                <input {...props} value={form.note} onChange={(e) => updateField('note', e.target.value)} maxLength={255} placeholder="e.g. weekend promotion" />
              )}
            </Field>

            <div className="drawer-footer">
              <button type="button" className="btn" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : canApprove ? 'Order products' : 'Send request'}
              </button>
            </div>
          </form>
        </Drawer>
      )}

      {declining && (
        <Drawer title={`Decline request #${declining.requestId}`} onClose={() => setDeclining(null)}>
          <form onSubmit={confirmDecline} noValidate aria-label="Decline request" className="drawer-form">
            <p className="muted">
              {declining.quantity} × {declining.productName} from {declining.supplierName}, requested by {declining.requestedBy}.
            </p>
            <Field id="reason" label="Reason" required error={reasonError} hint="The person who asked will see this.">
              {(props) => (
                <textarea
                  {...props}
                  rows={3}
                  maxLength={255}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (reasonError) setReasonError('');
                  }}
                />
              )}
            </Field>
            <div className="drawer-footer">
              <button type="button" className="btn" onClick={() => setDeclining(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Decline request'}
              </button>
            </div>
          </form>
        </Drawer>
      )}
    </>
  );
}
