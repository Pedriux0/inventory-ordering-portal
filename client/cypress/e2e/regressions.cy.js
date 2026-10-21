// regression tests for the defects found in docs/UX_EVALUATION.md
// each one failed before the fix and passes after it
describe('UX evaluation fixes', () => {
  it('a double click on a slow connection records the delivery only once', () => {
    let posts = 0;
    // slow the save down, like bad Wi-Fi in the stock room, and count how many are sent
    cy.intercept('POST', '/api/inventory/receipts', (req) => {
      posts += 1;
      req.on('response', (res) => res.setDelay(1500));
    }).as('receipt');

    cy.loginAs('Staff');
    cy.visit('/inventory');
    cy.contains('button', 'Receive stock').click();
    cy.pickProduct('#productId', 'Notebook A5 Dotted');
    cy.get('#supplierId').selectByText('Acme Office Supply');
    cy.get('#quantity').type('1');
    cy.contains('button', 'Record receipt').dblclick();

    cy.wait('@receipt');
    cy.get('[role=status]').should('contain', 'Stock is now');
    cy.then(() => expect(posts).to.equal(1));
  });

  it('a list that is still loading says so, instead of "No products yet"', () => {
    cy.intercept('GET', '/api/products', (req) => {
      req.on('response', (res) => res.setDelay(1500));
    });
    cy.loginAs('Staff');
    cy.visit('/products');
    cy.contains('Loading products...');
    cy.contains('No products yet').should('not.exist');
    cy.get('tbody tr').should('have.length.greaterThan', 0);
  });

  it('after placing an order, focus goes back to the first product field', () => {
    cy.loginAs('Staff');
    cy.visit('/orders');
    cy.pickProduct('#product-0', 'Notebook A5 Dotted');
    cy.get('#quantity-0').clear().type('1{enter}'); // Enter places the order
    cy.get('[role=status]').should('contain', 'confirmed');
    cy.focused().should('have.id', 'product-0');
  });
});
