import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, PackagePlus } from 'lucide-react'
import { api, displayDate, today } from '../api'
import Drawer from '../components/Drawer'
import ProductPicker from '../components/ProductPicker'
import { useToast } from '../components/Toast'
import { Field, Message, PageHeader, StockBadge, StockBar, focusFirstError } from '../components/ui'
import { useSaving } from '../hooks'
import { hasErrors, receiptErrors } from '../validation'

const emptyReceipt = (productId = '') => ({ productId, supplierId: '', quantity: '', dateReceived: today() });

// inventory page: current stock (FE-11, req 2.5.4) + receive stock (FE-10, req 2.5.2)
// links: /inventory?filter=low shows only products that need reordering,
//        /inventory?receive=5 opens "receive stock" with product 5 already chosen
export default function Inventory() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, guard] = useSaving();
  const [receiving, setReceiving] = useState(false);
  const [form, setForm] = useState(emptyReceipt());
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const formRef = useRef(null);

  const onlyLow = searchParams.get('filter') === 'low';

  async function loadAll() {
    try {
      const [stockList, productList, receiptList, supplierList] = await Promise.all([
        api.get('/inventory'),
        api.get('/products'),
        api.get('/inventory/receipts'),
        api.get('/suppliers'),
      ]);
      setStock(stockList);
      setProducts(productList);
      setReceipts(receiptList);
      // only active suppliers can deliver new stock
      setSuppliers(supplierList.filter((s) => s.isActive));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openReceive(productId = '') {
    setForm(emptyReceipt(productId));
    setErrors({});
    setServerError('');
    setReceiving(true);
  }

  // quick action from the dashboard: ?receive=<productId> (or ?receive=1 with no product)
  useEffect(() => {
    const receive = searchParams.get('receive');
    if (receive && products.length > 0) {
      const id = Number(receive);
      openReceive(products.some((p) => p.productId === id) ? id : '');
      const rest = new URLSearchParams(searchParams);
      rest.delete('receive');
      setSearchParams(rest, { replace: true });
    }
    // wait until products are loaded, so the product can be found
  }, [searchParams, products]);

  function setFilter(low) {
    setSearchParams(low ? { filter: 'low' } : {}, { replace: true });
  }

  function updateField(name, value) {
    const next = { ...form, [name]: value };
    setForm(next);
    if (errors[name]) setErrors(receiptErrors(next));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = receiptErrors(form);
    setErrors(found);
    setServerError('');
    if (hasErrors(found)) {
      setTimeout(() => focusFirstError(formRef.current));
      return;
    }
    // the guard stops a double click from recording the same delivery twice
    await guard(async () => {
      try {
        const receipt = await api.post('/inventory/receipts', {
          productId: Number(form.productId),
          supplierId: Number(form.supplierId),
          quantity: Number(form.quantity),
          dateReceived: form.dateReceived,
        });
        const product = products.find((p) => p.productId === receipt.productId);
        toast(`Received ${receipt.quantity} × ${product ? product.productName : 'product'}. Stock is now ${receipt.newStock}.`);
        setReceiving(false);
        loadAll();
      } catch (err) {
        setServerError(err.message); // e.g. "Supplier is deactivated"
      }
    });
  }

  // live "before -> after" preview, so the change can be checked before saving
  // (docs/UI_RESEARCH.md section B: show the previous quantity, the change and the result)
  const chosen = products.find((p) => p.productId === Number(form.productId));
  const qty = /^\d+$/.test(form.quantity) ? Number(form.quantity) : 0;

  const lowCount = stock.filter((item) => item.lowStock).length;
  const visible = onlyLow ? stock.filter((item) => item.lowStock) : stock;

  return (
    <>
      <PageHeader title="Inventory" description="Current stock levels, and stock that arrived from suppliers.">
        <button type="button" className="btn btn-primary" onClick={() => openReceive()}>
          <PackagePlus size={18} aria-hidden="true" /> Receive stock
        </button>
      </PageHeader>

      <Message>{loadError}</Message>

      <section className="card card-flush">
        <div className="card-header card-header-pad">
          <h2>Current stock</h2>
          {/* simple show-all / only-low switch, the active one is marked with aria-pressed */}
          <div className="segmented" role="group" aria-label="Filter products">
            <button type="button" aria-pressed={!onlyLow} onClick={() => setFilter(false)}>
              All <span className="count">{stock.length}</span>
            </button>
            <button type="button" aria-pressed={onlyLow} onClick={() => setFilter(true)}>
              Needs reorder <span className="count">{lowCount}</span>
            </button>
          </div>
        </div>
        <table className="responsive">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Stock</th>
              <th className="col-bar">Level <span className="sr-only">compared with reorder level</span></th>
              <th className="num">Reorder level</th>
              <th>Status</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.productId}>
                <td className="cell-title">{item.productName}</td>
                <td className="num" data-cy="stock" data-label="Stock">{item.currentStock}</td>
                <td className="col-bar" data-label="Level"><StockBar currentStock={item.currentStock} reorderLevel={item.reorderLevel} /></td>
                <td className="num" data-label="Reorder level">{item.reorderLevel}</td>
                <td data-label="Status"><StockBadge currentStock={item.currentStock} reorderLevel={item.reorderLevel} /></td>
                <td>
                  <div className="actions">
                    <button type="button" className="btn btn-small" onClick={() => openReceive(item.productId)}>
                      Receive<span className="sr-only"> {item.productName}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loaded && <p className="empty" role="status">Loading stock levels...</p>}
        {loaded && visible.length === 0 && !loadError && (
          <p className="empty">{onlyLow ? 'Nothing needs reordering right now.' : 'No products yet.'}</p>
        )}
      </section>

      <section className="card card-flush">
        <h2>Recent receipts</h2>
        {!loaded ? (
          <p className="empty">Loading receipts...</p>
        ) : receipts.length === 0 ? (
          <p className="empty">No receipts recorded yet. Use “Receive stock” when a delivery arrives.</p>
        ) : (
          <table className="responsive">
            <thead>
              <tr><th>Date</th><th>Product</th><th>Supplier</th><th className="num">Qty</th><th>Received by</th></tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.receiptId}>
                  <td>
                    <div>{displayDate(r.dateReceived)}</div>
                    <div className="cell-sub">Receipt #{r.receiptId}</div>
                  </td>
                  <td className="cell-title" data-label="Product">{r.productName}</td>
                  <td data-label="Supplier">{r.supplierName}</td>
                  <td className="num" data-label="Qty">+{r.quantityReceived}</td>
                  <td data-label="Received by">{r.receivedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {receiving && (
        <Drawer title="Receive stock" onClose={() => setReceiving(false)}>
          <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label="Record inventory receipt" className="drawer-form">
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
            <div className="form-row">
              <Field id="quantity" label="Quantity received" required error={errors.quantity}>
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={form.quantity}
                    onChange={(e) => updateField('quantity', e.target.value)}
                    // coming from "Receive" on a row: the product is chosen, so start at the quantity
                    data-autofocus={form.productId ? true : undefined}
                  />
                )}
              </Field>
              <Field id="dateReceived" label="Date received" required error={errors.dateReceived}>
                {(props) => (
                  <input {...props} type="date" max={today()} value={form.dateReceived} onChange={(e) => updateField('dateReceived', e.target.value)} />
                )}
              </Field>
            </div>

            {chosen && (
              <div className="preview" aria-live="polite">
                <span className="preview-label">Stock after this receipt</span>
                <span className="preview-change">
                  <span>{chosen.currentStock}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                  <span className="sr-only">becomes</span>
                  <strong>{chosen.currentStock + qty}</strong>
                </span>
              </div>
            )}

            <div className="drawer-footer">
              <button type="button" className="btn" onClick={() => setReceiving(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Record receipt'}
              </button>
            </div>
          </form>
        </Drawer>
      )}
    </>
  );
}
