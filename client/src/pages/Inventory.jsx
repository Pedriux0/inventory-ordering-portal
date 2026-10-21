import { useEffect, useState } from 'react'
import { api, shortDate, today } from '../api'
import { Message, PageHeader, StockBadge } from '../components/ui'

// inventory page: current stock (FE-11, req 2.5.4) + record a receipt (FE-10, req 2.5.2)
export default function Inventory() {
  const [stock, setStock] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ productId: '', supplierId: '', quantity: '', dateReceived: today() });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadAll() {
    try {
      const [stockList, receiptList, supplierList] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/receipts'),
        api.get('/suppliers'),
      ]);
      setStock(stockList);
      setReceipts(receiptList);
      // only active suppliers can deliver new stock
      setSuppliers(supplierList.filter((s) => s.isActive));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const receipt = await api.post('/inventory/receipts', {
        productId: Number(form.productId),
        supplierId: Number(form.supplierId),
        quantity: Number(form.quantity),
        dateReceived: form.dateReceived,
      });
      const product = stock.find((p) => p.productId === receipt.productId);
      setSuccess(`Received ${receipt.quantity} × ${product ? product.productName : 'product'}. Stock is now ${receipt.newStock}.`);
      setForm({ ...form, quantity: '' });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Inventory" description="Current stock levels, and stock that arrived from suppliers." />

      <form className="card form" onSubmit={handleSubmit} aria-label="Record inventory receipt">
        <h2>Record inventory receipt</h2>
        <Message>{error}</Message>
        <Message type="success">{success}</Message>

        <div className="form-row">
          <div>
            <label htmlFor="productId">Product</label>
            <select id="productId" name="productId" value={form.productId} onChange={updateField} required>
              <option value="">Choose a product</option>
              {stock.map((p) => (
                <option key={p.productId} value={p.productId}>{p.productName}</option>
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
            <label htmlFor="quantity">Quantity received</label>
            <input id="quantity" name="quantity" type="number" min="1" step="1" value={form.quantity} onChange={updateField} required />
          </div>
          <div>
            <label htmlFor="dateReceived">Date received</label>
            <input id="dateReceived" name="dateReceived" type="date" max={today()} value={form.dateReceived} onChange={updateField} required />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Record receipt</button>
        </div>
      </form>

      <section className="card card-flush">
        <h2>Current stock</h2>
        <table>
          <thead>
            <tr><th>Product</th><th className="num">Stock</th><th className="num">Reorder level</th><th>Status</th></tr>
          </thead>
          <tbody>
            {stock.map((item) => (
              <tr key={item.productId}>
                <td className="cell-title">{item.productName}</td>
                <td className="num" data-cy="stock">{item.currentStock}</td>
                <td className="num">{item.reorderLevel}</td>
                <td><StockBadge currentStock={item.currentStock} reorderLevel={item.reorderLevel} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card card-flush">
        <h2>Recent receipts</h2>
        {receipts.length === 0 ? (
          <p className="empty">No receipts recorded yet. Use the form above when stock arrives.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Date</th><th>Product</th><th>Supplier</th><th className="num">Qty</th><th>Received by</th></tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.receiptId}>
                  <td>
                    <div>{shortDate(r.dateReceived)}</div>
                    <div className="cell-sub">Receipt #{r.receiptId}</div>
                  </td>
                  <td className="cell-title">{r.productName}</td>
                  <td>{r.supplierName}</td>
                  <td className="num">+{r.quantityReceived}</td>
                  <td>{r.receivedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
