import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import { api, money } from '../api'
import Drawer from '../components/Drawer'
import { useToast } from '../components/Toast'
import { Field, Message, PageHeader, Pagination, SearchBar, SortHeader, StockBadge, focusFirstError } from '../components/ui'
import { useSaving } from '../hooks'
import { hasErrors, productErrors } from '../validation'

const PAGE_SIZE = 25; // req 2.6.4

const EMPTY_FORM = { productName: '', description: '', unitPrice: '', currentStock: '', reorderLevel: '' };

// products page: list + create / edit in a side panel (mockup 3, FE-03, reqs 2.4.1 and 2.5.1)
// week 7 (mockup 7): search by name or #id (2.6.1, FE-07), sort by name / price / stock
// (2.6.3, FE-08), 25 per page (2.6.4, FE-13). The server does the search, sort and paging,
// so it stays fast with thousands of products
export default function Products() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({ search: '', sort: 'name', order: 'asc', page: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(false); // false = still loading, never show "no products" yet
  const [saving, guard] = useSaving();
  const [editing, setEditing] = useState(null); // null = panel closed, 'new' or a product
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const formRef = useRef(null);

  async function loadProducts(q = query) {
    try {
      const params = new URLSearchParams({ sort: q.sort, order: q.order, page: q.page, limit: PAGE_SIZE });
      if (q.search) params.set('search', q.search);
      const { items, total: count } = await api.getPage(`/products?${params}`);
      setProducts(items);
      setTotal(count);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
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
    setEditing('new');
    setForm(EMPTY_FORM);
    setErrors({});
    setServerError('');
  }

  // the dashboard's "New product" quick action links here with ?new=1
  useEffect(() => {
    if (searchParams.get('new')) {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  function openEdit(product) {
    setEditing(product);
    setForm({
      productName: product.productName,
      description: product.description || '',
      unitPrice: product.unitPrice.toFixed(2),
      currentStock: String(product.currentStock),
      reorderLevel: String(product.reorderLevel),
    });
    setErrors({});
    setServerError('');
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    // a field that had an error is re-checked while typing, so the message goes away once fixed
    if (errors[name]) setErrors(productErrors({ ...form, [name]: value }, { isNew: editing === 'new' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const isNew = editing === 'new';
    const found = productErrors(form, { isNew });
    setErrors(found);
    setServerError('');
    if (hasErrors(found)) {
      // wait for react to draw the messages, then jump to the first bad field
      setTimeout(() => focusFirstError(formRef.current));
      return;
    }

    // form inputs are always text, the api wants real numbers
    const body = {
      productName: form.productName,
      description: form.description,
      unitPrice: Number(form.unitPrice),
      reorderLevel: form.reorderLevel === '' ? 0 : Number(form.reorderLevel),
    };

    await guard(async () => {
      try {
        if (isNew) {
          await api.post('/products', { ...body, currentStock: Number(form.currentStock) });
          toast(`Product "${form.productName.trim()}" created.`);
          // with 25 per page the new product could be on another page: show it straight away
          // (as a search for its name, removable with the chip like any search)
          const name = form.productName.trim();
          setEditing(null);
          setSearchInput(name);
          setQuery({ ...query, search: name, page: 1 });
          return;
        } else {
          await api.put(`/products/${editing.productId}`, body);
          toast(`Product "${form.productName.trim()}" updated.`);
        }
        setEditing(null);
        loadProducts();
      } catch (err) {
        setServerError(err.message);
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Products"
        description={loaded ? (query.search ? 'Search results' : `${total} products`) : 'Loading...'}
      >
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} aria-hidden="true" /> New product
        </button>
      </PageHeader>

      <Message>{loadError}</Message>

      <SearchBar
        id="product-search"
        label="Search products"
        placeholder="Search by name or #id, e.g. lamp or #12"
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={handleSearch}
        active={query.search}
        total={total}
        onClear={clearSearch}
      />

      <section className="card card-flush">
        <table className="responsive">
          <thead>
            <tr>
              <SortHeader column="name" label="Product" sort={query.sort} order={query.order} onSort={handleSort} />
              <SortHeader column="stock" label="Stock" className="num" sort={query.sort} order={query.order} onSort={handleSort} />
              <th className="num">Reorder level</th>
              <SortHeader column="price" label="Unit price" className="num" sort={query.sort} order={query.order} onSort={handleSort} />
              <th>Status</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId} className={editing && editing.productId === product.productId ? 'selected' : ''}>
                {/* the name comes first so people can scan for it, the id is secondary (NN/G) */}
                <td>
                  <div className="cell-title">{product.productName}</div>
                  <div className="cell-sub">
                    <span data-cy="product-id">#{product.productId}</span>
                    {product.description && ` · ${product.description}`}
                  </div>
                </td>
                <td className="num" data-label="Stock" data-cy="stock">{product.currentStock}</td>
                <td className="num" data-label="Reorder level">{product.reorderLevel}</td>
                <td className="num" data-label="Unit price" data-cy="price">{money(product.unitPrice)}</td>
                <td data-label="Status"><StockBadge currentStock={product.currentStock} reorderLevel={product.reorderLevel} /></td>
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
        {!loaded && <p className="empty" role="status">Loading products...</p>}
        {loaded && products.length === 0 && !loadError && (
          <p className="empty">
            {query.search ? 'No products match your search. Try part of the name, or #id.' : 'No products yet. Create your first one with “New product”.'}
          </p>
        )}
        <Pagination page={query.page} pageSize={PAGE_SIZE} total={total} onPage={(page) => setQuery({ ...query, page })} label="Products pages" />
      </section>

      {editing && (
        <Drawer title={editing === 'new' ? 'New product' : `Edit ${editing.productName}`} onClose={() => setEditing(null)}>
          <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label="Product form" className="drawer-form">
            <Message>{serverError}</Message>

            <p className="form-section">Product information</p>
            <Field id="productName" label="Product name" required error={errors.productName}>
              {(props) => <input {...props} value={form.productName} onChange={updateField} maxLength={128} />}
            </Field>
            <Field id="description" label="Description">
              {(props) => <textarea {...props} rows={3} value={form.description} onChange={updateField} />}
            </Field>

            <p className="form-section">Pricing &amp; stock</p>
            <Field id="unitPrice" label="Unit price ($)" required error={errors.unitPrice}>
              {(props) => (
                <input {...props} type="number" inputMode="decimal" step="0.01" min="0" value={form.unitPrice} onChange={updateField} />
              )}
            </Field>
            <div className="form-row">
              <Field
                id="currentStock"
                label={editing === 'new' ? 'Initial stock' : 'Current stock'}
                required={editing === 'new'}
                error={errors.currentStock}
                hint={editing === 'new' ? null : 'Changes through receipts and orders'}
              >
                {/* stock can only be set when creating, after that it changes through receipts and orders */}
                {(props) => (
                  <input {...props} type="number" inputMode="numeric" min="0" step="1" value={form.currentStock} onChange={updateField} disabled={editing !== 'new'} />
                )}
              </Field>
              <Field id="reorderLevel" label="Reorder level" error={errors.reorderLevel} hint="Alert when stock drops to this">
                {(props) => (
                  <input {...props} type="number" inputMode="numeric" min="0" step="1" value={form.reorderLevel} onChange={updateField} />
                )}
              </Field>
            </div>

            <div className="drawer-footer">
              <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editing === 'new' ? 'Create product' : 'Save changes'}
              </button>
            </div>
          </form>
        </Drawer>
      )}
    </>
  );
}
