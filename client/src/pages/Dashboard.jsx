import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, money, shortDate } from '../api'
import { Message, StatCard, StockBadge } from '../components/ui'

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
      <h1>Dashboard</h1>

      <div className="stats">
        <StatCard label="Total products" value={data.inventory.length} />
        <StatCard label="Orders" value={data.orders.length} />
        <StatCard label="Low stock items" value={lowStock.length} />
        <StatCard label="Active suppliers" value={activeSuppliers.length} />
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Low stock alerts</h2>
          <Link to="/inventory">View all →</Link>
        </div>
        {lowStock.length === 0 ? (
          <p className="muted">Every product is above its reorder level.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Product</th><th>Stock</th><th>Reorder level</th><th>Status</th></tr>
            </thead>
            <tbody>
              {lowStock.map((item) => (
                <tr key={item.productId}>
                  <td>{item.productName}</td>
                  <td>{item.currentStock}</td>
                  <td>{item.reorderLevel}</td>
                  <td><StockBadge currentStock={item.currentStock} reorderLevel={item.reorderLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Recent orders</h2>
          <Link to="/orders">View all →</Link>
        </div>
        {data.orders.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Order</th><th>Date</th><th>Units</th><th>Total</th><th>By</th></tr>
            </thead>
            <tbody>
              {data.orders.slice(0, 5).map((order) => (
                <tr key={order.orderId}>
                  <td>#{order.orderId}</td>
                  <td>{shortDate(order.orderDate)}</td>
                  <td>{order.unitCount}</td>
                  <td>{money(order.totalAmount)}</td>
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
