import { useEffect, useState } from 'react'
import { api, money, shortDate } from '../api'
import { useAuth } from '../auth'
import { Message } from '../components/ui'

const EMPTY_LINE = { productId: '', quantity: '1' };

// orders page: process a sales order (FE-04, req 2.5.3) + order history (mockup 6)
// client change to req 2.5.3 (2026-10-21): Staff orders go to a Manager for approval first,
// Managers and Admins place orders directly
export default function Orders() {
  const { canManageSuppliers: canOrderDirectly } = useAuth(); // Managers and Admins
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [lines, setLines] = useState([EMPTY_LINE]);
  const [confirmed, setConfirmed] = useState(null); // the last order that went through
  const [sentForApproval, setSentForApproval] = useState(null); // the last Staff order sent to a Manager
  const [selected, setSelected] = useState(null); // order opened in the details panel
  const [error, setError] = useState('');

  async function loadAll() {
    try {
      const [productList, orderList] = await Promise.all([api.get('/products'), api.get('/orders')]);
      setProducts(productList);
      setOrders(orderList);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function updateLine(index, field, value) {
    setLines(lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  function removeLine(index) {
    setLines(lines.filter((_, i) => i !== index));
  }

  // running total shown before submitting, the server calculates the real one
  const estimatedTotal = lines.reduce((sum, line) => {
    const product = products.find((p) => p.productId === Number(line.productId));
    return product ? sum + product.unitPrice * Number(line.quantity || 0) : sum;
  }, 0);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setConfirmed(null);
    setSentForApproval(null);
    const items = lines.map((line) => ({ productId: Number(line.productId), quantity: Number(line.quantity) }));
    try {
      if (canOrderDirectly) {
        setConfirmed(await api.post('/orders', { items }));
      } else {
        // Staff: the order waits for a Manager, stock only goes down once it is approved
        setSentForApproval(await api.post('/order-requests', { items }));
      }
      setLines([EMPTY_LINE]);
      loadAll();
    } catch (err) {
      setError(err.message); // e.g. "Wireless Mouse M200: Not enough stock: 3 available, 5 requested"
    }
  }

  async function openOrder(orderId) {
    try {
      setSelected(await api.get(`/orders/${orderId}`));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1>Orders</h1>

      <form className="card form" onSubmit={handleSubmit} aria-label="New sales order">
        <h2>New sales order</h2>
        {!canOrderDirectly && (
          <p className="muted small">A Manager approves your order before it is processed. You can follow it on the Requests page.</p>
        )}
        <Message>{error}</Message>
        {sentForApproval && (
          <Message type="success">
            Order sent to a Manager for approval (request #{sentForApproval.orderRequestId}, estimated total{' '}
            {money(sentForApproval.estimatedTotal)}).
          </Message>
        )}
        {confirmed && (
          <Message type="success">
            Order #{confirmed.orderId} confirmed, total {money(confirmed.totalAmount)}.
          </Message>
        )}

        {lines.map((line, index) => (
          <div className="form-row order-line" key={index}>
            <div>
              <label htmlFor={`product-${index}`}>Product</label>
              <select
                id={`product-${index}`}
                name="productId"
                value={line.productId}
                onChange={(e) => updateLine(index, 'productId', e.target.value)}
                required
              >
                <option value="">Choose a product</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} ({p.currentStock} in stock, {money(p.unitPrice)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`quantity-${index}`}>Quantity</label>
              <input
                id={`quantity-${index}`}
                name="quantity"
                type="number"
                min="1"
                step="1"
                value={line.quantity}
                onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                required
              />
            </div>
            {lines.length > 1 && (
              <button type="button" className="btn btn-small" onClick={() => removeLine(index)}>
                Remove<span className="sr-only"> line {index + 1}</span>
              </button>
            )}
          </div>
        ))}

        <div className="form-actions">
          <button type="button" className="btn" onClick={() => setLines([...lines, EMPTY_LINE])}>
            + Add product
          </button>
          <span className="order-total">Estimated total: <strong>{money(estimatedTotal)}</strong></span>
          <button type="submit" className="btn btn-primary">{canOrderDirectly ? 'Place order' : 'Send for approval'}</button>
        </div>
      </form>

      {selected && (
        <section className="card">
          <div className="card-header">
            <h2>Order #{selected.orderId}</h2>
            <button type="button" className="btn btn-small" onClick={() => setSelected(null)}>Close</button>
          </div>
          <p className="muted">{shortDate(selected.orderDate)} · by {selected.createdBy}</p>
          <table>
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr>
            </thead>
            <tbody>
              {selected.items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unitPrice)}</td>
                  <td>{money(item.unitPrice * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="order-total">Total: <strong>{money(selected.totalAmount)}</strong></p>
        </section>
      )}

      <section className="card">
        <h2>Order history</h2>
        {orders.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Order</th><th>Date</th><th>Products</th><th>Units</th><th>Total</th><th>By</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td>#{order.orderId}</td>
                  <td>{shortDate(order.orderDate)}</td>
                  <td>{order.lineCount}</td>
                  <td>{order.unitCount}</td>
                  <td>{money(order.totalAmount)}</td>
                  <td>{order.createdBy}</td>
                  <td>
                    <button type="button" className="btn btn-small" onClick={() => openOrder(order.orderId)}>
                      View<span className="sr-only"> order {order.orderId}</span>
                    </button>
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
