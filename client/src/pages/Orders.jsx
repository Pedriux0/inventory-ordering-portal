import { useEffect, useRef, useState } from 'react'
import { Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { api, displayDate, money, plural } from '../api'
import Drawer from '../components/Drawer'
import ProductPicker from '../components/ProductPicker'
import { useToast } from '../components/Toast'
import { Field, Message, PageHeader, focusFirstError } from '../components/ui'
import { useSaving } from '../hooks'
import { hasErrors, orderLineErrors } from '../validation'

let nextLineKey = 1;
const newLine = () => ({ key: nextLineKey++, productId: '', quantity: '1' });

// orders page: a point-of-sale style order builder (FE-04, req 2.5.3) + order history (mockup 6)
// docs/UI_RESEARCH.md section C: searchable product picker, stock + price on every option,
// a warning while typing if you ask for more than is in stock, and an order summary to check
// before placing the order. The server still checks stock again inside a transaction.
export default function Orders() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [lines, setLines] = useState(() => [newLine()]);
  const [submitted, setSubmitted] = useState(false); // show "choose a product" only after a try
  const [serverError, setServerError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null); // order opened in the side panel
  const [loaded, setLoaded] = useState(false);
  const [placing, guard] = useSaving(); // also blocks a double click on "Place order"
  const formRef = useRef(null);

  async function loadAll() {
    try {
      const [productList, orderList] = await Promise.all([api.get('/products'), api.get('/orders')]);
      setProducts(productList);
      setOrders(orderList);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // ready for the next customer: after an order, focus goes back to the first product field
  // (before, it was lost to the top of the page - docs/UX_EVALUATION.md). An effect runs after
  // react has drawn the fresh empty line, so the field really exists when it gets focus
  const [readyForNext, setReadyForNext] = useState(0);
  useEffect(() => {
    if (readyForNext > 0) document.getElementById('product-0')?.focus();
  }, [readyForNext]);

  const productById = (id) => products.find((p) => p.productId === Number(id));

  // errors for every line, worked out on each render from the current values
  const lineErrors = lines.map((line) => orderLineErrors(line, productById(line.productId)));

  // what to actually show: quantity problems right away (e.g. "Only 23 in stock"),
  // a missing product only after the user tried to place the order
  function shownError(index, field) {
    const error = lineErrors[index][field];
    if (!error) return undefined;
    if (field === 'quantity' && lines[index].quantity !== '') return error;
    return submitted ? error : undefined;
  }

  function updateLine(index, field, value) {
    setLines(lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
    setServerError('');
  }

  function removeLine(index) {
    setLines(lines.filter((_, i) => i !== index));
  }

  const summaryLines = lines
    .map((line) => ({ line, product: productById(line.productId), qty: Number(line.quantity) || 0 }))
    .filter((row) => row.product && row.qty > 0);
  const total = summaryLines.reduce((sum, row) => sum + Math.round(row.product.unitPrice * 100) * row.qty, 0) / 100;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (lineErrors.some(hasErrors)) {
      setTimeout(() => focusFirstError(formRef.current));
      return;
    }

    await guard(async () => {
      try {
        const order = await api.post('/orders', {
          items: lines.map((line) => ({ productId: Number(line.productId), quantity: Number(line.quantity) })),
        });
        toast(`Order #${order.orderId} confirmed, total ${money(order.totalAmount)}.`);
        setLines([newLine()]);
        setSubmitted(false);
        loadAll();
        setReadyForNext((n) => n + 1);
      } catch (err) {
        // e.g. someone else just sold the last units: "Wireless Mouse M200: Not enough stock..."
        setServerError(err.message);
      }
    });
  }

  async function openOrder(orderId) {
    try {
      setSelected(await api.get(`/orders/${orderId}`));
    } catch (err) {
      setLoadError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Orders" description="Build a sales order, check the summary, then place it." />
      <Message>{loadError}</Message>

      <div className="orders-layout">
        <form ref={formRef} id="order-form" className="card" onSubmit={handleSubmit} noValidate aria-label="New sales order">
          <h2>New sales order</h2>
          <Message>{serverError}</Message>

          {lines.map((line, index) => {
            const product = productById(line.productId);
            // a product can only be in the order once, so other lines' products are left out
            const takenElsewhere = lines.filter((_, i) => i !== index).map((l) => Number(l.productId));
            const choices = products.filter((p) => !takenElsewhere.includes(p.productId));
            return (
              <div className="order-line" key={line.key}>
                <Field id={`product-${index}`} label={`Product ${lines.length > 1 ? index + 1 : ''}`.trim()} error={shownError(index, 'productId')}>
                  {(props) => (
                    <ProductPicker {...props} products={choices} value={line.productId} onChange={(id) => updateLine(index, 'productId', id)} />
                  )}
                </Field>
                <Field id={`quantity-${index}`} label="Quantity" error={shownError(index, 'quantity')}>
                  {(props) => (
                    <input
                      {...props}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={product ? product.currentStock : undefined}
                      step="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    />
                  )}
                </Field>
                <div className="line-total">
                  <span className="line-total-label">Subtotal</span>
                  {product ? money(product.unitPrice * (Number(line.quantity) || 0)) : '—'}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                  aria-label={`Remove line ${index + 1}`}
                  title="Remove line"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}

          <button type="button" className="btn" onClick={() => setLines([...lines, newLine()])}>
            <Plus size={16} aria-hidden="true" /> Add product
          </button>
        </form>

        {/* order summary stays in view while the lines are edited */}
        <aside className="card order-summary" aria-labelledby="summary-title">
          <h2 id="summary-title">Order summary</h2>
          {summaryLines.length === 0 ? (
            <p className="muted small">Choose a product to start the order.</p>
          ) : (
            <ul className="summary-lines">
              {summaryLines.map(({ line, product, qty }) => (
                <li key={line.key}>
                  <span>
                    {product.productName}
                    <span className="cell-sub"> {qty} × {money(product.unitPrice)}</span>
                    {qty > product.currentStock && (
                      <span className="summary-warning">Only {product.currentStock} in stock</span>
                    )}
                  </span>
                  <span className="num">{money(product.unitPrice * qty)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <button type="submit" form="order-form" className="btn btn-primary btn-block" disabled={placing}>
            <ShoppingCart size={18} aria-hidden="true" /> {placing ? 'Placing order...' : 'Place order'}
          </button>
          <p className="hint">Stock is checked again when the order is placed.</p>
        </aside>
      </div>

      <section className="card card-flush">
        <h2>Order history</h2>
        {!loaded ? (
          <p className="empty" role="status">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="empty">No orders yet. Place the first one with the form above.</p>
        ) : (
          <table className="responsive">
            <thead>
              <tr>
                <th>Order</th><th>Date</th><th className="num">Products</th><th className="num">Units</th>
                <th className="num">Total</th><th>By</th><th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId} className={selected && selected.orderId === order.orderId ? 'selected' : ''}>
                  <td className="cell-title">#{order.orderId}</td>
                  <td data-label="Date">{displayDate(order.orderDate)}</td>
                  <td className="num" data-label="Products">{order.lineCount}</td>
                  <td className="num" data-label="Units">{order.unitCount}</td>
                  <td className="num" data-label="Total">{money(order.totalAmount)}</td>
                  <td data-label="By">{order.createdBy}</td>
                  <td>
                    <div className="actions">
                      <button type="button" className="btn btn-small" onClick={() => openOrder(order.orderId)}>
                        View<span className="sr-only"> order {order.orderId}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selected && (
        <Drawer title={`Order #${selected.orderId}`} onClose={() => setSelected(null)}>
          <p className="muted">
            {displayDate(selected.orderDate)} · {plural(selected.items.reduce((n, i) => n + i.quantity, 0), 'unit')} · by {selected.createdBy}
          </p>
          <ul className="summary-lines">
            {selected.items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.productName}
                  <span className="cell-sub"> {item.quantity} × {money(item.unitPrice)}</span>
                </span>
                <span className="num">{money(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(selected.totalAmount)}</strong>
          </div>
        </Drawer>
      )}
    </>
  );
}
