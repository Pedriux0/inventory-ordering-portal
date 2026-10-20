describe('orders (req 2.5.3)', () => {
  // FE-04
  it('FE-04 Staff processes an order and it is confirmed', () => {
    cy.loginAs('Staff');
    cy.contains('a', 'Orders').click();

    cy.get('#product-0').selectByText('Notebook A5 Dotted');
    cy.get('#quantity-0').clear().type('3');
    cy.contains('button', 'Add product').click();
    cy.get('#product-1').selectByText('Ergonomic Desk Lamp LED');
    cy.get('#quantity-1').clear().type('1');
    cy.contains('button', 'Place order').click();

    // 3 x 6.75 + 1 x 49.99 = 70.24
    cy.get('[role=status]').should('contain', 'confirmed').and('contain', '$70.24');
    cy.contains('h2', 'Order history').parent().find('tbody tr').first().should('contain', '$70.24');
  });

  it('ordering more than the stock shows a clear error', () => {
    cy.loginAs('Staff');
    cy.visit('/orders');
    cy.get('#product-0').selectByText('Wireless Mouse M200');
    cy.get('#quantity-0').clear().type('100000');
    cy.contains('button', 'Place order').click();
    cy.get('[role=alert]').should('contain', 'Not enough stock');
  });
});
