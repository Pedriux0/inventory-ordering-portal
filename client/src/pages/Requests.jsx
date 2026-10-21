import { useEffect, useRef, useState } from 'react'
import { api, money, shortDate } from '../api'
import { useAuth } from '../auth'
import { Message } from '../components/ui'

const EMPTY_FORM = { productId: '', supplierId: '', quantity: '', note: '' };

// status label colors: waiting = amber, approved = green, declined = red (with the word, not color alone)
const STATUS_BADGE = { Pending: 'badge-low', Approved: 'badge-ok', Declined: 'badge-critical' };

// requests page: everything that waits for a Manager's approval
// 1. sales orders from Staff (client change to req 2.5.3): approving processes the order
// 2. purchase requests (req 2.2.5, "inventory approval")
// Staff ask for products to be ordered from a supplier, a Manager or Admin approves or declines.
// Managers and Admins dont need approval: their requests are approved straight away.
export default function Requests() {
  const { user, canManageSuppliers: canApprove } = useAuth(); // same roles: Manager and Admin
  const [requests, setRequests] = useState([]);
  const [orderRequests, setOrderRequests] = useState([]);
  const [decliningOrder, setDecliningOrder] = useState(null); // id of the sales order being declined
  const [orderReason, setOrderReason] = useState('');
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [declining, setDeclining] = useState(null); // id of the request being declined
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false); // stops a double click from sending the same thing twice

  async function loadAll() {
    try {
      const [orderRequestList, requestList, productList, supplierList] = await Promise.all([
        api.get('/order-requests'),
        api.get('/purchase-requests'),
        api.get('/products'),
        api.get('/suppliers'),
      ]);
      setOrderRequests(orderRequestList);
      setRequests(requestList);
      setProducts(productList);
      setSuppliers(supplierList.filter((s) => s.isActive)); // only active suppliers can be ordered from
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // runs an action once, even if the button is clicked twice
  async function once(action) {
    if (busy.current) return;
    busy.current = true;
    setError('');
    setSuccess('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
    }
  }

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    once(async () => {
      const created = await api.post('/purchase-requests', {
        productId: Number(form.productId),
        supplierId: Number(form.supplierId),
        quantity: Number(form.quantity),
        note: form.note,
      });
      setSuccess(
        created.status === 'Approved'
          ? `Request for ${created.quantity} × ${created.productName} approved.`
          : `Request for ${created.quantity} × ${created.productName} sent for approval.`
      );
      setForm(EMPTY_FORM);
      loadAll();
    });
  }

  function approve(request) {
    once(async () => {
      await api.put(`/purchase-requests/${request.requestId}/decision`, { decision: 'Approved' });
      setSuccess(`Request #${request.requestId} approved.`);
      loadAll();
    });
  }

  function confirmDecline(request) {
    once(async () => {
      await api.put(`/purchase-requests/${request.requestId}/decision`, { decision: 'Declined', note: reason });
      setSuccess(`Request #${request.requestId} declined.`);
      setDeclining(null);
      setReason('');
      loadAll();
    });
  }

  // sales orders: approving creates the real order and takes the stock
  function approveOrder(request) {
    once(async () => {
      const updated = await api.put(`/order-requests/${request.orderRequestId}/decision`, { decision: 'Approved' });
      setSuccess(`Sales order request #${request.orderRequestId} approved: it is now order #${updated.orderId}.`);
      loadAll();
    });
  }

  function confirmDeclineOrder(request) {
    once(async () => {
      await api.put(`/order-requests/${request.orderRequestId}/decision`, { decision: 'Declined', note: orderReason });
      setSuccess(`Sales order request #${request.orderRequestId} declined.`);
      setDecliningOrder(null);
      setOrderReason('');
      loadAll();
    });
  }

  const pendingOrders = orderRequests.filter((r) => r.status === 'Pending');
  const decidedOrders = orderRequests.filter((r) => r.status !== 'Pending');
  const pending = requests.filter((r) => r.status === 'Pending');
  const decided = requests.filter((r) => r.status !== 'Pending');

  return (
    <>
      <h1>Requests</h1>

      <Message>{error}</Message>
      <Message type="success">{success}</Message>

      <section className="card">
        <h2>Sales orders waiting for approval ({pendingOrders.length})</h2>
        <p className="muted small">Orders placed by Staff. Approving processes the order and takes the stock.</p>
        {!loaded ? (
          <p className="muted">Loading...</p>
        ) : pendingOrders.length === 0 ? (
          <p className="muted">No sales orders are waiting.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th><th>Products</th><th>Estimated total</th><th>Requested by</th>
                {canApprove && <th><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {pendingOrders.map((r) => (
                <tr key={r.orderRequestId}>
                  <td>{r.orderRequestId}</td>
                  <td>
                    {r.items.map((i) => (
                      <div key={i.productId}>
                        {i.quantity} × {i.productName}
                        {i.quantity > i.inStock && <span className="badge badge-critical">only {i.inStock} in stock</span>}
                      </div>
                    ))}
                  </td>
                  <td>{money(r.estimatedTotal)}</td>
                  <td>
                    {r.requestedBy}
                    <div className="muted small">{shortDate(r.createdAt)}</div>
                  </td>
                  {canApprove && (
                    <td>
                      {decliningOrder === r.orderRequestId ? (
                        <div className="decline-box">
                          <label htmlFor={`order-reason-${r.orderRequestId}`} className="small">Reason for declining</label>
                          <input
                            id={`order-reason-${r.orderRequestId}`}
                            value={orderReason}
                            onChange={(e) => setOrderReason(e.target.value)}
                            maxLength={255}
                            autoFocus
                          />
                          <div className="actions">
                            <button type="button" className="btn btn-small" onClick={() => confirmDeclineOrder(r)} disabled={!orderReason.trim()}>
                              Confirm decline
                            </button>
                            <button type="button" className="btn btn-small" onClick={() => setDecliningOrder(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="actions">
                          <button type="button" className="btn btn-small btn-primary" onClick={() => approveOrder(r)}>
                            Approve<span className="sr-only"> sales order request {r.orderRequestId}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() => {
                              setDecliningOrder(r.orderRequestId);
                              setOrderReason('');
                            }}
                          >
                            Decline<span className="sr-only"> sales order request {r.orderRequestId}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <form className="card form" onSubmit={handleSubmit} aria-label="New purchase request">
        <h2>{canApprove ? 'Order products' : 'Request products'}</h2>
        <p className="muted small">
          {canApprove
            ? `As a ${user.role}, your requests are approved right away.`
            : 'A Manager will approve or decline your request.'}
        </p>
        <div className="form-row">
          <div>
            <label htmlFor="productId">Product</label>
            <select id="productId" name="productId" value={form.productId} onChange={updateField} required>
              <option value="">Choose a product</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName} ({p.currentStock} in stock)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="supplierId">Supplier</label>
            <select id="supplierId" name="supplierId" value={form.supplierId} onChange={updateField} required>
              <option value="">Choose a supplier</option>
              {suppliers.map((s) => (
                <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="quantity">Quantity</label>
            <input id="quantity" name="quantity" type="number" min="1" step="1" value={form.quantity} onChange={updateField} required />
          </div>
        </div>
        <label htmlFor="note">Note (optional)</label>
        <input id="note" name="note" value={form.note} onChange={updateField} maxLength={255} placeholder="e.g. weekend promotion" />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">{canApprove ? 'Order products' : 'Send request'}</button>
        </div>
      </form>

      <section className="card">
        <h2>Purchase requests waiting for approval ({pending.length})</h2>
        {!loaded ? (
          <p className="muted">Loading...</p>
        ) : pending.length === 0 ? (
          <p className="muted">No purchase requests are waiting.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th><th>Product</th><th>Qty</th><th>Supplier</th><th>Requested by</th><th>Note</th>
                {canApprove && <th><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.requestId}>
                  <td>{r.requestId}</td>
                  <td>{r.productName}</td>
                  <td>{r.quantity}</td>
                  <td>{r.supplierName}</td>
                  <td>
                    {r.requestedBy}
                    <div className="muted small">{shortDate(r.createdAt)}</div>
                  </td>
                  <td>{r.note || '—'}</td>
                  {canApprove && (
                    <td>
                      {declining === r.requestId ? (
                        // declining needs a reason, so the person who asked knows why
                        <div className="decline-box">
                          <label htmlFor={`reason-${r.requestId}`} className="small">Reason for declining</label>
                          <input
                            id={`reason-${r.requestId}`}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            maxLength={255}
                            autoFocus
                          />
                          <div className="actions">
                            <button type="button" className="btn btn-small" onClick={() => confirmDecline(r)} disabled={!reason.trim()}>
                              Confirm decline
                            </button>
                            <button type="button" className="btn btn-small" onClick={() => setDeclining(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="actions">
                          <button type="button" className="btn btn-small btn-primary" onClick={() => approve(r)}>
                            Approve<span className="sr-only"> request {r.requestId}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() => {
                              setDeclining(r.requestId);
                              setReason('');
                            }}
                          >
                            Decline<span className="sr-only"> request {r.requestId}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Sales order history</h2>
        {loaded && decidedOrders.length === 0 ? (
          <p className="muted">No decided sales orders yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>#</th><th>Products</th><th>Requested by</th><th>Status</th><th>Decided by</th></tr>
            </thead>
            <tbody>
              {decidedOrders.map((r) => (
                <tr key={r.orderRequestId}>
                  <td>{r.orderRequestId}</td>
                  <td>{r.items.map((i) => `${i.quantity} × ${i.productName}`).join(', ')}</td>
                  <td>{r.requestedBy}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    {r.orderId && <div className="muted small">became order #{r.orderId}</div>}
                    {r.decisionNote && <div className="muted small">{r.decisionNote}</div>}
                  </td>
                  <td>
                    {r.decidedBy}
                    <div className="muted small">{shortDate(r.decidedAt)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Purchase request history</h2>
        {loaded && decided.length === 0 ? (
          <p className="muted">No decided requests yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>#</th><th>Product</th><th>Qty</th><th>Supplier</th><th>Requested by</th><th>Status</th><th>Decided by</th></tr>
            </thead>
            <tbody>
              {decided.map((r) => (
                <tr key={r.requestId}>
                  <td>{r.requestId}</td>
                  <td>{r.productName}</td>
                  <td>{r.quantity}</td>
                  <td>{r.supplierName}</td>
                  <td>{r.requestedBy}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    {r.decisionNote && <div className="muted small">{r.decisionNote}</div>}
                  </td>
                  <td>
                    {r.decidedBy}
                    <div className="muted small">{shortDate(r.decidedAt)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
