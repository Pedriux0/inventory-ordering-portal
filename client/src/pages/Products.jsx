import { useEffect, useState } from 'react'
import { api, money } from '../api'
import { Pencil, Plus } from 'lucide-react'
import { Message, PageHeader, StockBadge } from '../components/ui'

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
      // products that need reordering come first, most urgent at the top
      // (stock as a share of the reorder level), everything else stays A-Z like the api sends it
      const urgency = (p) => (p.lowStock ? p.currentStock / Math.max(p.reorderLevel, 1) : Number.MAX_VALUE);
      const list = await api.get('/products');
      setProducts([...list].sort((a, b) => urgency(a) - urgency(b)));
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
      <PageHeader title="Products" description="Everything you sell, with its price and current stock.">
        {!form && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} aria-hidden="true" /> New product
          </button>
        )}
      </PageHeader>

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

      <section className="card card-flush">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Stock</th>
              <th className="num">Reorder level</th>
              <th className="num">Unit price</th>
              <th>Status</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId}>
                {/* the name comes first so people can scan for it, the id is secondary (NN/G) */}
                <td>
                  <div className="cell-title">{product.productName}</div>
                  <div className="cell-sub">
                    #{product.productId}
                    {product.description && ` · ${product.description}`}
                  </div>
                </td>
                <td className="num">{product.currentStock}</td>
                <td className="num">{product.reorderLevel}</td>
                <td className="num">{money(product.unitPrice)}</td>
                <td><StockBadge currentStock={product.currentStock} reorderLevel={product.reorderLevel} /></td>
                <td>
                  <div className="actions">
                    <button type="button" className="btn btn-small" onClick={() => openEdit(product)}>
                      <Pencil size={14} aria-hidden="true" /> Edit<span className="sr-only"> {product.productName}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="empty">No products yet. Create your first one with “New product”.</p>}
      </section>
    </>
  );
}
