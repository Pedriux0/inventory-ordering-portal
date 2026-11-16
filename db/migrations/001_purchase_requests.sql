-- adds the purchase_requests table to a database created before v2.2.0
-- run once with: mysql -u root -p inventory_portal < db/migrations/001_purchase_requests.sql

-- PURCHASE REQUESTS (req 2.2.5, inventory approval)
-- someone asks for products to be ordered from a supplier, a Manager approves or declines it
-- requests made by a Manager or Admin are approved straight away (they dont need approval)
-- approving does NOT change stock: stock still only changes when the delivery is received
CREATE TABLE IF NOT EXISTS purchase_requests (
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
