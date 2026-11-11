-- Inventory & Ordering Management Portal database schema

CREATE DATABASE IF NOT EXISTS inventory_portal;
USE inventory_portal;

-- USERS 
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash CHAR(60) NOT NULL,
  role ENUM('Admin', 'Manager', 'Staff') NOT NULL DEFAULT 'Staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- password reset (req 2.1.5): only the hash of the token is stored
  reset_token_hash CHAR(64) NULL,
  reset_token_expires DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- PRODUCTS
CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(128) NOT NULL,
    description TEXT,
    unit_price DECIMAL(10, 2) NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- SUPPLIERS 
CREATE TABLE suppliers (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(128) NOT NULL,
    contact_email VARCHAR(254),
    contact_phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ORDERS 
CREATE TABLE orders(
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
-- ORDER ITEMS
CREATE Table order_items(
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_sold INT NOT NULL,
    unit_price_at_sale DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
-- INVENTORY RECEIPTS 
CREATE TABLE inventory_receipts (
    receipt_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    quantity_received INT NOT NULL,
    date_received DATE NOT NULL,
    received_by INT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    FOREIGN KEY (received_by) REFERENCES users(user_id)
);
-- AUDIT LOGS
CREATE TABLE audit_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT, 
    user_id INT,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
-- PURCHASE REQUESTS (req 2.2.5, inventory approval)
-- someone asks for products to be ordered from a supplier, a Manager approves or declines it
-- requests made by a Manager or Admin are approved straight away (they dont need approval)
-- approving does NOT change stock: stock still only changes when the delivery is received
CREATE TABLE purchase_requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    quantity INT NOT NULL,
    note VARCHAR(255),
    status ENUM('Pending', 'Approved', 'Declined') NOT NULL DEFAULT 'Pending',
    requested_by INT NOT NULL,
    decided_by INT NULL,
    decided_at DATETIME NULL,
    decision_note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    FOREIGN KEY (requested_by) REFERENCES users(user_id),
    FOREIGN KEY (decided_by) REFERENCES users(user_id)
);

-- ORDER REQUESTS (client change to req 2.5.3, 2026-10-21)
-- a sales order placed by Staff waits here until a Manager or Admin approves it.
-- on approval the real order is created (orders + order_items) and the stock goes down,
-- so the orders table only ever holds real, approved sales. order_id points to that order.
-- Managers and Admins place orders directly, without a request.
CREATE TABLE order_requests (
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
CREATE TABLE order_request_items (
    order_request_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_request_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_request_id) REFERENCES order_requests(order_request_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
