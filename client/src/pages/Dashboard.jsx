import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CircleCheck, PackagePlus, Plus, ShoppingCart } from 'lucide-react'
import { api, money, plural, shortDate, today } from '../api'
import { useAuth } from '../auth'
import { Message, PageHeader, StockBadge, StockBar } from '../components/ui'

// dashboard (mockup 2), rebuilt around one question: "what needs my attention now?"
// docs/UI_RESEARCH.md section D:
// - NN/G operational dashboards: the problems come first, readable at a glance
// - stock shown as bars (length is the quickest thing to compare), no pies or gauges
// - every number is a link to the list behind it, plus quick actions for the common jobs
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // the three lists are independent, so we load them at the same time
    Promise.all([api.get('/inventory'), api.get('/orders'), api.get('/products')])
      .then(([inventory, orders, products]) => setData({ inventory, orders, products }))
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
  const todays = data.orders.filter((order) => shortDate(order.orderDate) === today());
  const salesToday = todays.reduce((sum, order) => sum + order.totalAmount, 0);
  const stockValue = data.products.reduce((sum, p) => sum + p.unitPrice * p.currentStock, 0);

  return (
    <>
      {header}

      <div className="kpis">
        <Link to="/inventory?filter=low" className={`card kpi ${needsAttention.length ? 'kpi-alert' : ''}`}>
          <span className="kpi-label">Need reordering</span>
          <span className="kpi-value">{needsAttention.length}</span>
          <span className="kpi-note">of {plural(data.inventory.length, 'product')}</span>
        </Link>
        <Link to="/orders" className="card kpi">
          <span className="kpi-label">Orders today</span>
          <span className="kpi-value">{todays.length}</span>
          <span className="kpi-note">{data.orders.length} in total</span>
        </Link>
        <Link to="/orders" className="card kpi">
          <span className="kpi-label">Sales today</span>
          <span className="kpi-value">{money(salesToday)}</span>
          <span className="kpi-note">from {plural(todays.length, 'order')}</span>
        </Link>
        <Link to="/products" className="card kpi">
          <span className="kpi-label">Stock value</span>
          <span className="kpi-value">{money(stockValue)}</span>
          <span className="kpi-note">at current prices</span>
        </Link>
      </div>

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
                  <Link className="btn btn-small" to={`/inventory?receive=${item.productId}`}>
                    <PackagePlus size={14} aria-hidden="true" /> Receive<span className="sr-only"> {item.productName}</span>
                  </Link>
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
                      {shortDate(order.orderDate)} · {plural(order.unitCount, 'unit')} · {order.createdBy}
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
