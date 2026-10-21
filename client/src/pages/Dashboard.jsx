import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, money, shortDate } from '../api'
import { Message, PageHeader, StatCard, StockBadge } from '../components/ui'

// dashboard (mockup 2): summary numbers, low stock alerts, recent orders
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // the three lists are independent, so we load them at the same time
    Promise.all([api.get('/inventory'), api.get('/orders'), api.get('/suppliers')])
      .then(([inventory, orders, suppliers]) => setData({ inventory, orders, suppliers }))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Message>{error}</Message>;
  if (!data) return <p>Loading...</p>;

  const lowStock = data.inventory.filter((item) => item.lowStock);
  const activeSuppliers = data.suppliers.filter((s) => s.isActive);

  return (
    <>
      <PageHeader title="Dashboard" description="What needs your attention today." />

      <div className="stats">
        <StatCard label="Total products" value={data.inventory.length} />
        <StatCard label="Orders" value={data.orders.length} />
        <StatCard label="Low stock items" value={lowStock.length} />
        <StatCard label="Active suppliers" value={activeSuppliers.length} />
      </div>

      <section className="card card-flush">
        <div className="card-header card-header-pad">
          <h2>Low stock alerts</h2>
          <Link to="/inventory">View all →</Link>
        </div>
        {lowStock.length === 0 ? (
          <p className="empty">Every product is above its reorder level.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Product</th><th className="num">Stock</th><th className="num">Reorder level</th><th>Status</th></tr>
            </thead>
            <tbody>
              {lowStock.map((item) => (
                <tr key={item.productId}>
                  <td className="cell-title">{item.productName}</td>
                  <td className="num">{item.currentStock}</td>
                  <td className="num">{item.reorderLevel}</td>
                  <td><StockBadge currentStock={item.currentStock} reorderLevel={item.reorderLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card card-flush">
        <div className="card-header card-header-pad">
          <h2>Recent orders</h2>
          <Link to="/orders">View all →</Link>
        </div>
        {data.orders.length === 0 ? (
          <p className="empty">No orders yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Order</th><th>Date</th><th className="num">Units</th><th className="num">Total</th><th>By</th></tr>
            </thead>
            <tbody>
              {data.orders.slice(0, 5).map((order) => (
                <tr key={order.orderId}>
                  <td className="cell-title">#{order.orderId}</td>
                  <td>{shortDate(order.orderDate)}</td>
                  <td className="num">{order.unitCount}</td>
                  <td className="num">{money(order.totalAmount)}</td>
                  <td>{order.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
