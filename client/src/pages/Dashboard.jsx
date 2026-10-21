import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, money, shortDate } from '../api'
import { useAuth } from '../auth'
import { Message, StatCard, StockBadge } from '../components/ui'

// dashboard (mockup 2): summary numbers, low stock alerts, recent orders
export default function Dashboard() {
  const { canManageSuppliers: canApprove } = useAuth(); // Managers and Admins approve requests
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

      {/* managers see what is waiting for their approval (req 2.2.5) */}
      {canApprove && data.pendingRequests.length > 0 && (
        <section className="card pending-box">
          <div className="card-header">
            <h2>{data.pendingRequests.length} request{data.pendingRequests.length === 1 ? '' : 's'} waiting for your approval</h2>
            <Link to="/requests">Review →</Link>
          </div>
        </section>
      )}

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
