import { useEffect, useState } from 'react'
import { api, money } from '../api'
import { Message, Pagination, SortHeader, StockBadge } from '../components/ui'
import { useSaving } from '../hooks'

const PAGE_SIZE = 25; // req 2.6.4

const EMPTY_FORM = { productName: '', description: '', unitPrice: '', currentStock: '', reorderLevel: '' };

// products page: list + create / edit form (mockup 3, FE-03, reqs 2.4.1 and 2.5.1)
// week 7 (mockup 7): search by name or #id (2.6.1, FE-07), sort by name / price / stock
// (2.6.3, FE-08), 25 per page (2.6.4, FE-13)
export default function Products() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState({ search: '', sort: 'name', order: 'asc', page: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [saving, guard] = useSaving();
  const [form, setForm] = useState(null); // null = form closed
  const [editingId, setEditingId] = useState(null); // null = creating a new product
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadProducts(q = query) {
    try {
      const params = new URLSearchParams({ sort: q.sort, order: q.order, page: q.page, limit: PAGE_SIZE });
      if (q.search) params.set('search', q.search);
      const { items, total: count } = await api.getPage(`/products?${params}`);
      setProducts(items);
      setTotal(count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadProducts(query);
  }, [query]);

  function handleSearch(event) {
    event.preventDefault();
    setQuery({ ...query, search: searchInput.trim(), page: 1 }); // a new search starts at page 1
  }

  function clearSearch() {
    setSearchInput('');
    setQuery({ ...query, search: '', page: 1 });
  }

  // clicking the column you are sorting by flips the order, a new column starts ascending
  function handleSort(column) {
    const order = query.sort === column && query.order === 'asc' ? 'desc' : 'asc';
    setQuery({ ...query, sort: column, order, page: 1 });
  }

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

    // the guard stops a double click from creating the same product twice
    await guard(async () => {
      try {
        if (editingId) {
          await api.put(`/products/${editingId}`, body);
          setSuccess(`Product "${form.productName}" updated.`);
        } else {
          await api.post('/products', { ...body, currentStock: Number(form.currentStock) });
          setSuccess(`Product "${form.productName}" created.`);
          // with 25 per page the new product could be on another page: show it straight away
          // (as a search for its name, removable with the chip like any search)
          const name = form.productName.trim();
          setForm(null);
          setSearchInput(name);
          setQuery({ ...query, search: name, page: 1 });
          return;
        }
        setForm(null);
        loadProducts();
      } catch (err) {
        setError(err.message); // validation errors from the api, e.g. "Product name is required"
      }
    });
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
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create product'}
            </button>
            <button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <section className="card">
        {/* search by name or by product id (2.6.1) */}
        <form className="search-bar" role="search" onSubmit={handleSearch}>
          <label htmlFor="product-search">Search products</label>
          <div className="search-row">
            <input
              id="product-search"
              type="search"
              placeholder="Name or #id, e.g. lamp or #12"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn">Search</button>
          </div>
        </form>
        {query.search && (
          // the active filter, shown as a chip you can remove (mockup 7)
          <p className="chips">
            <span className="chip">
              Search: “{query.search}”
              <button type="button" onClick={clearSearch} aria-label={`Remove search ${query.search}`}>×</button>
            </span>
            <span className="muted small">{total} found</span>
          </p>
        )}

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <SortHeader column="name" label="Product" sort={query.sort} order={query.order} onSort={handleSort} />
              <SortHeader column="price" label="Unit price" sort={query.sort} order={query.order} onSort={handleSort} />
              <SortHeader column="stock" label="Stock" sort={query.sort} order={query.order} onSort={handleSort} />
              <th>Status</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId}>
                <td>{product.productId}</td>
                <td>
                  <div>{product.productName}</div>
                  {product.description && <div className="muted small">{product.description}</div>}
                </td>
                <td data-cy="price">{money(product.unitPrice)}</td>
                <td data-cy="stock">{product.currentStock}</td>
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
        {!loaded && <p className="muted" role="status">Loading products...</p>}
        {loaded && products.length === 0 && (
          <p className="muted">{query.search ? 'No products match your search.' : 'No products yet.'}</p>
        )}
        <Pagination
          page={query.page}
          pageSize={PAGE_SIZE}
          total={total}
          onPage={(page) => setQuery({ ...query, page })}
          label="Products pages"
        />
      </section>
    </>
  );
}
