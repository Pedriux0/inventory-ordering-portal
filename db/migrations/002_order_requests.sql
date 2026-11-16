-- adds order_requests + order_request_items to a database created before v2.3.0
-- run once with: mysql -u root -p inventory_portal < db/migrations/002_order_requests.sql

-- ORDER REQUESTS (client change to req 2.5.3, 2026-10-21)
-- a sales order placed by Staff waits here until a Manager or Admin approves it.
-- on approval the real order is created (orders + order_items) and the stock goes down,
-- so the orders table only ever holds real, approved sales. order_id points to that order.
-- Managers and Admins place orders directly, without a request.
CREATE TABLE IF NOT EXISTS order_requests (
    order_request_id INT PRIMARY KEY AUTO_INCREMENT,
    requested_by INT NOT NULL,
    status ENUM('Pending', 'Approved', 'Declined') NOT NULL DEFAULT 'Pending',
    decided_by INT NULL,
    decided_at DATETIME NULL,
    decision_note VARCHAR(255) NULL,
    order_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(user_id),
    FOREIGN KEY (decided_by) REFERENCES users(user_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
-- ORDER REQUEST ITEMS: the products and quantities of a requested order
-- (the price is taken when the order is approved, like any other order)
CREATE TABLE IF NOT EXISTS order_request_items (
    order_request_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_request_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_request_id) REFERENCES order_requests(order_request_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
