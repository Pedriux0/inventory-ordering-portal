import { useEffect, useState } from 'react'
import { api, money } from '../api'
import { Message, StockBadge } from '../components/ui'

const EMPTY_FORM = { productName: '', description: '', unitPrice: '', currentStock: '', reorderLevel: '' };

// products page: list + create / edit form (mockup 3, FE-03, reqs 2.4.1 and 2.5.1)
export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null); // null = form closed
  const [editingId, setEditingId] = useState(null); // null = creating a new product
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadProducts() {
    try {
      setProducts(await api.get('/products'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setSuccess('');
  }

  function openEdit(product) {
    setEditingId(product.productId);
    setForm({
      productName: product.productName,
      description: product.description || '',
      unitPrice: String(product.unitPrice),
      currentStock: String(product.currentStock),
      reorderLevel: String(product.reorderLevel),
    });
    setError('');
    setSuccess('');
  }

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    // form inputs are always text, the api wants real numbers
    const body = {
      productName: form.productName,
      description: form.description,
      unitPrice: Number(form.unitPrice),
      reorderLevel: form.reorderLevel === '' ? 0 : Number(form.reorderLevel),
    };

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, body);
        setSuccess(`Product "${form.productName}" updated.`);
      } else {
        await api.post('/products', { ...body, currentStock: Number(form.currentStock) });
        setSuccess(`Product "${form.productName}" created.`);
      }
      setForm(null);
      loadProducts();
    } catch (err) {
      setError(err.message); // validation errors from the api, e.g. "Product name is required"
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Products</h1>
        {!form && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + New product
          </button>
        )}
      </div>

      <Message type="success">{success}</Message>
      {!form && <Message>{error}</Message>}

      {form && (
        <form className="card form" onSubmit={handleSubmit} aria-label="Product form">
          <h2>{editingId ? 'Edit product' : 'Create new product'}</h2>
          <Message>{error}</Message>

          <p className="form-section">Product information</p>
          <label htmlFor="productName">Product name <span className="required">*</span></label>
          <input id="productName" name="productName" value={form.productName} onChange={updateField} maxLength={128} />

          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} value={form.description} onChange={updateField} />

          <p className="form-section">Pricing &amp; stock</p>
          <div className="form-row">
            <div>
              <label htmlFor="unitPrice">Unit price ($) <span className="required">*</span></label>
              <input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" value={form.unitPrice} onChange={updateField} />
            </div>
            <div>
              <label htmlFor="currentStock">{editingId ? 'Current stock' : 'Initial stock'} {!editingId && <span className="required">*</span>}</label>
              {/* stock can only be set when creating, after that it changes through receipts and orders */}
              <input id="currentStock" name="currentStock" type="number" min="0" step="1" value={form.currentStock} onChange={updateField} disabled={!!editingId} />
            </div>
            <div>
              <label htmlFor="reorderLevel">Reorder level</label>
              <input id="reorderLevel" name="reorderLevel" type="number" min="0" step="1" value={form.reorderLevel} onChange={updateField} />
            </div>
          </div>
          <p className="hint">You will be alerted when stock drops to this level.</p>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{editingId ? 'Save changes' : 'Create product'}</button>
            <button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <section className="card">
        <table>
          <thead>
            <tr><th>ID</th><th>Product</th><th>Unit price</th><th>Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId}>
                <td>{product.productId}</td>
                <td>
                  <div>{product.productName}</div>
                  {product.description && <div className="muted small">{product.description}</div>}
                </td>
                <td>{money(product.unitPrice)}</td>
                <td>{product.currentStock}</td>
                <td><StockBadge currentStock={product.currentStock} reorderLevel={product.reorderLevel} /></td>
                <td>
                  <button type="button" className="btn btn-small" onClick={() => openEdit(product)}>
                    Edit<span className="sr-only"> {product.productName}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="muted">No products yet.</p>}
      </section>
    </>
  );
}
