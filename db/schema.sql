-- Inventory & Ordering Management Portal database schema

CREATE DATABASE IF NOT EXISTS inventory_portal;
USE inventory_portal;

-- USERS 
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(128),
  email VARCHAR(128) NOT NULL UNIQUE,
  password_hash CHAR(60) NOT NULL,
  role ENUM('Admin', 'Manager', 'Staff'),
  is_active BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- PRODUCTS
CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
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