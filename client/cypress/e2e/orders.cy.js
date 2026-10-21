describe('orders (req 2.5.3)', () => {
  // FE-04
  it('FE-04 Staff processes an order and it is confirmed', () => {
    cy.loginAs('Staff');
    cy.contains('a', 'Orders').click();

    cy.pickProduct('#product-0', 'Notebook A5 Dotted');
    cy.get('#quantity-0').clear().type('3');
    cy.contains('button', 'Add product').click();
    cy.pickProduct('#product-1', 'Ergonomic Desk Lamp LED');
    cy.get('#quantity-1').clear().type('1');

    // 3 x 6.75 + 1 x 49.99 = 70.24, shown in the summary before placing the order
    cy.get('.order-summary').should('contain', '$70.24');
    cy.contains('button', 'Place order').click();

    cy.get('[role=status]').should('contain', 'confirmed').and('contain', '$70.24');
    cy.contains('h2', 'Order history').parent().find('tbody tr').first().should('contain', '$70.24');
  });

  it('asking for more than the stock warns while typing', () => {
    cy.loginAs('Staff');
    cy.visit('/orders');
    cy.pickProduct('#product-0', 'Wireless Mouse M200');
    cy.get('#quantity-0').clear().type('100000');
    cy.get('#quantity-0-error').should('contain', 'in stock');
    cy.contains('button', 'Place order').click();
    cy.get('#quantity-0').should('be.focused'); // nothing was sent, focus goes to the problem
  });
});
