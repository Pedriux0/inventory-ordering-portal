// week 7: search, sort and pagination (reqs 2.6.1 - 2.6.4)
describe('search, sort and pages', () => {
  const tag = `Pager${Date.now().toString(36)}`;

  before(() => {
    // 30 products with prices 1..30, all tagged so the tests only look at their own data
    cy.apiToken('Staff').then((token) => {
      for (let i = 1; i <= 30; i += 1) {
        cy.request({
          method: 'POST',
          url: '/api/products',
          headers: { Authorization: `Bearer ${token}` },
          body: { productName: `${tag} item ${String(i).padStart(2, '0')}`, unitPrice: i, currentStock: 100 - i, reorderLevel: 0 },
        });
      }
    });
  });

  // FE-07
  it('FE-07 search products by name shows only the matching ones (any upper/lower case)', () => {
    cy.loginAs('Staff');
    cy.visit('/products');
    // "item 1" matches items 10-19 of this test's 30 products (not "item 01"), typed in upper case
    cy.get('#product-search').type(`${tag.toUpperCase()} ITEM 1{enter}`);
    cy.contains('10 found');
    cy.get('tbody tr').should('have.length', 10).each(($row) => {
      expect($row.text().toLowerCase()).to.contain(`${tag.toLowerCase()} item 1`);
    });
    // remove the filter chip: the full list comes back
    cy.get(`button[aria-label^="Remove search"]`).click();
    cy.contains('found').should('not.exist');
    cy.get('tbody tr').should('have.length.greaterThan', 10);
  });

  it('search by product id (#id) finds that product', () => {
    cy.loginAs('Staff');
    cy.visit('/products');
    cy.get('tbody tr').first().find('[data-cy=product-id]').invoke('text').then((id) => {
      cy.get('#product-search').type(`${id}{enter}`); // "#12"
      cy.get('tbody tr').should('have.length', 1).find('[data-cy=product-id]').should('have.text', id);
    });
  });

  // FE-08
  it('FE-08 sort products by price: click the column, ascending, click again, descending', () => {
    cy.loginAs('Staff');
    cy.visit('/products');
    cy.get('#product-search').type(`${tag}{enter}`);
    cy.contains('button', 'Unit price').click();
    cy.get('th[aria-sort="ascending"]').should('contain', 'Unit price');
    cy.get('tbody tr').first().find('[data-cy=price]').should('have.text', '$1.00');
    cy.contains('button', 'Unit price').click();
    cy.get('th[aria-sort="descending"]').should('contain', 'Unit price');
    cy.get('tbody tr').first().find('[data-cy=price]').should('have.text', '$30.00');
  });

  // FE-13
  it('FE-13 more than 25 products are shown 25 per page with working controls', () => {
    cy.loginAs('Staff');
    cy.visit('/products');
    cy.get('#product-search').type(`${tag}{enter}`);
    cy.contains('Showing 1-25 of 30');
    cy.get('tbody tr').should('have.length', 25);
    cy.contains('button', 'Previous').should('be.disabled');
    cy.contains('button', 'Next').click();
    cy.contains('Showing 26-30 of 30');
    cy.get('tbody tr').should('have.length', 5);
    cy.contains('button', 'Next').should('be.disabled');
    cy.contains('button', 'Previous').click();
    cy.contains('Showing 1-25 of 30');
  });

  // FE-12
  it('FE-12 search orders by date shows the matching orders', () => {
    cy.apiToken('Manager').then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/orders',
        headers: { Authorization: `Bearer ${token}` },
        body: { items: [{ productId: 1, quantity: 1 }] },
        failOnStatusCode: false,
      }).then((created) => {
        // product 1 may be out of stock on a busy database: use any order then
        const orderUrl = created.status === 201 ? `/api/orders/${created.body.orderId}` : null;
        cy.request({ url: orderUrl || '/api/orders?page=1&limit=1', headers: { Authorization: `Bearer ${token}` } }).then((res) => {
          const order = orderUrl ? res.body : res.body[0];
          const date = String(order.orderDate).slice(0, 10);

          cy.loginAs('Staff');
          cy.visit('/orders');
          cy.get('#order-search').type(`${date}{enter}`);
          cy.contains(`Search: “${date}”`);
          cy.contains('h2', 'Order history').parent().find('tbody tr').should('have.length.greaterThan', 0).each(($row) => {
            // the date is shown as "Oct 20, 2026"; data-date has it as YYYY-MM-DD
            expect($row.find('[data-cy=order-date]').attr('data-date')).to.equal(date);
          });

          // and by order number: exactly that order
          cy.get('#order-search').clear().type(`${order.orderId}{enter}`);
          cy.contains('h2', 'Order history').parent().find('tbody tr').should('have.length', 1).and('contain', `#${order.orderId}`);
        });
      });
    });
  });

  it('a search that is neither a number nor a date explains what to type', () => {
    cy.loginAs('Staff');
    cy.visit('/orders');
    cy.get('#order-search').type('yesterday{enter}');
    cy.get('[role=alert]').should('contain', 'Search orders by order number');
  });
});
