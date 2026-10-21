import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CircleCheck, ClipboardCheck, Clock, PackagePlus, Plus, ShoppingCart } from 'lucide-react'
import { api, displayDate, money, plural } from '../api'
import { useAuth } from '../auth'
import { Message, PageHeader, StockBadge, StockBar } from '../components/ui'

// dashboard (mockup 2), rebuilt around one question: "what needs my attention now?"
// docs/UI_RESEARCH.md section D:
// - NN/G operational dashboards: the problems come first, readable at a glance
// - stock shown as bars (length is the quickest thing to compare), no pies or gauges
// - every number is a link to the list behind it, plus quick actions for the common jobs
export default function Dashboard() {
  const { user, canManageSuppliers: canApprove } = useAuth(); // Managers and Admins approve requests
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // the three lists are independent, so we load them at the same time
    Promise.all([
      api.get('/inventory'),
      api.get('/orders'),
      api.get('/suppliers'),
      api.get('/purchase-requests?status=Pending'),
      api.get('/order-requests?status=Pending'),
    ])
      .then(([inventory, orders, suppliers, pendingPurchases, pendingOrders]) =>
        // one number for everything waiting: sales orders from Staff + purchase requests
        setData({ inventory, orders, suppliers, pendingRequests: [...pendingOrders, ...pendingPurchases] })
      )
      .catch((err) => setError(err.message));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user.fullName.split(' ')[0];
  const dateText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const header = (
    <PageHeader title={`${greeting}, ${firstName}`} description={dateText}>
      {/* quick actions: one primary (the most common job), the rest secondary */}
      <div className="header-actions">
        <Link className="btn" to="/inventory?receive=1"><PackagePlus size={18} aria-hidden="true" /> Receive stock</Link>
        <Link className="btn" to="/products?new=1"><Plus size={18} aria-hidden="true" /> New product</Link>
        <Link className="btn btn-primary" to="/orders"><ShoppingCart size={18} aria-hidden="true" /> New order</Link>
      </div>
    </PageHeader>
  );

  if (error) return <>{header}<Message>{error}</Message></>;
  if (!data) return <>{header}<p className="muted">Loading...</p></>;

  // most urgent first: lowest stock compared with its reorder level (the api already sorts like this)
  const needsAttention = data.inventory.filter((item) => item.lowStock);
  const activeSuppliers = data.suppliers.filter((s) => s.isActive).length;

  return (
    <>
      {header}

      {/* the four summary numbers from mockup 2: products, orders, low stock, suppliers
          each card is a link to the list behind it */}
      <div className="kpis">
        <Link to="/products" className="card kpi">
          <span className="kpi-label">Total products</span>
          <span className="kpi-value">{data.inventory.length}</span>
          <span className="kpi-note">in the catalog</span>
        </Link>
        <Link to="/orders" className="card kpi">
          <span className="kpi-label">Orders</span>
          <span className="kpi-value">{data.orders.length}</span>
          <span className="kpi-note">processed so far</span>
        </Link>
        <Link to="/inventory?filter=low" className={`card kpi ${needsAttention.length ? 'kpi-alert' : ''}`}>
          <span className="kpi-label">Low stock items</span>
          <span className="kpi-value">{needsAttention.length}</span>
          <span className="kpi-note">at or below reorder level</span>
        </Link>
        <Link to="/suppliers" className="card kpi">
          <span className="kpi-label">Active suppliers</span>
          <span className="kpi-value">{activeSuppliers}</span>
          <span className="kpi-note">of {plural(data.suppliers.length, 'supplier')}</span>
        </Link>
      </div>

      {/* managers see what is waiting for their approval (req 2.2.5) */}
      {canApprove && data.pendingRequests.length > 0 && (
        <section className="card approval-banner" aria-label="Requests waiting for approval">
          <p>
            <Clock size={18} aria-hidden="true" />
            {plural(data.pendingRequests.length, 'request')} waiting for your approval
          </p>
          <Link className="btn btn-small" to="/requests">
            <ClipboardCheck size={14} aria-hidden="true" /> Review
          </Link>
        </section>
      )}

      <div className="dashboard-grid">
        <section className="card card-flush" aria-labelledby="attention-title">
          <div className="card-header card-header-pad">
            <h2 id="attention-title">Needs attention</h2>
            <Link to="/inventory?filter=low">View all <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          {needsAttention.length === 0 ? (
            <p className="empty all-good">
              <CircleCheck size={20} aria-hidden="true" /> All stocked up. Every product is above its reorder level.
            </p>
          ) : (
            <ul className="attention-list">
              {needsAttention.map((item) => (
                <li key={item.productId}>
                  <div className="attention-main">
                    <div className="attention-top">
                      <span className="cell-title">{item.productName}</span>
                      <StockBadge currentStock={item.currentStock} reorderLevel={item.reorderLevel} />
                    </div>
                    <StockBar currentStock={item.currentStock} reorderLevel={item.reorderLevel} />
                    <span className="cell-sub">
                      {item.currentStock} in stock · reorder at {item.reorderLevel}
                    </span>
                  </div>
                  <div className="actions">
                    {/* ask for more (Staff) or order it (Manager, approved right away) */}
                    <Link className="btn btn-small" to={`/requests?product=${item.productId}`}>
                      <ClipboardCheck size={14} aria-hidden="true" /> {canApprove ? 'Order' : 'Request'}
                      <span className="sr-only"> {item.productName}</span>
                    </Link>
                    <Link className="btn btn-small" to={`/inventory?receive=${item.productId}`}>
                      <PackagePlus size={14} aria-hidden="true" /> Receive<span className="sr-only"> {item.productName}</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-flush" aria-labelledby="recent-title">
          <div className="card-header card-header-pad">
            <h2 id="recent-title">Recent orders</h2>
            <Link to="/orders">View all <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          {data.orders.length === 0 ? (
            <p className="empty">No orders yet.</p>
          ) : (
            <ul className="recent-list">
              {data.orders.slice(0, 6).map((order) => (
                <li key={order.orderId}>
                  <div>
                    <div className="cell-title">Order #{order.orderId}</div>
                    <div className="cell-sub">
                      {displayDate(order.orderDate)} · {plural(order.unitCount, 'unit')} · {order.createdBy}
                    </div>
                  </div>
                  <span className="num">{money(order.totalAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
