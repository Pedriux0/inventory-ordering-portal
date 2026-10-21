// sales orders (req 2.5.3, with the client change of 2026-10-21):
// Staff orders wait for a Manager's approval, Managers and Admins order directly
describe('orders (req 2.5.3)', () => {
  // FE-04
  it('FE-04 Staff sends an order, a Manager approves it, and it is confirmed', () => {
    cy.loginAs('Staff');
    cy.contains('a', 'Orders').click();
    cy.contains('send it to a Manager');

    cy.pickProduct('#product-0', 'Notebook A5 Dotted');
    cy.get('#quantity-0').clear().type('3');
    cy.contains('button', 'Add product').click();
    cy.pickProduct('#product-1', 'Ergonomic Desk Lamp LED');
    cy.get('#quantity-1').clear().type('1');

    // 3 x 6.75 + 1 x 49.99 = 70.24
    cy.get('.order-summary').should('contain', '$70.24');
    cy.contains('button', 'Send for approval').click();
    cy.get('[role=status]').should('contain', 'sent to a Manager for approval').and('contain', '$70.24');

    cy.contains('button', 'Sign Out').click();
    cy.loginAs('Manager');
    cy.contains('waiting for your approval').parent().contains('a', 'Review').click();
    cy.contains('h2', 'Sales orders waiting').closest('section').contains('tr', 'Notebook A5 Dotted').contains('button', 'Approve').click();
    cy.get('[role=status]').should('contain', 'approved').and('contain', 'is now order #');

    cy.visit('/orders');
    cy.contains('h2', 'Order history').parent().find('tbody tr').first().should('contain', '$70.24').and('contain', 'Maria Garcia');
  });

  it('a Manager places an order directly, no approval needed', () => {
    cy.loginAs('Manager');
    cy.visit('/orders');
    cy.pickProduct('#product-0', 'Notebook A5 Dotted');
    cy.get('#quantity-0').clear().type('2');
    cy.contains('button', 'Place order').click();
    cy.get('[role=status]').should('contain', 'confirmed').and('contain', '$13.50');
  });

  it('declining a Staff order needs a reason and does not change the stock', () => {
    cy.loginAs('Staff');
    cy.visit('/inventory');
    cy.contains('tr', '27in Monitor QHD').find('[data-cy=stock]').invoke('text').then((before) => {
      cy.visit('/orders');
      cy.pickProduct('#product-0', '27in Monitor QHD');
      cy.get('#quantity-0').clear().type('2');
      cy.contains('button', 'Send for approval').click();
      cy.get('[role=status]').should('contain', 'sent to a Manager');

      cy.contains('button', 'Sign Out').click();
      cy.loginAs('Manager');
      cy.visit('/requests');
      cy.contains('h2', 'Sales orders waiting').closest('section').contains('tr', '27in Monitor QHD').contains('button', 'Decline').click();
      cy.get('[role=dialog]').contains('button', 'Decline request').click(); // no reason yet
      cy.get('#reason-error').should('contain', 'Write a reason');
      cy.get('#reason').type('Customer cancelled');
      cy.get('[role=dialog]').contains('button', 'Decline request').click();
      cy.get('[role=status]').should('contain', 'declined');
      cy.contains('button', 'All').click();
      cy.contains('h2', 'Sales orders from Staff').closest('section').contains('tr', '27in Monitor QHD')
        .should('contain', 'Declined').and('contain', 'Customer cancelled');

      cy.visit('/inventory');
      cy.contains('tr', '27in Monitor QHD').find('[data-cy=stock]').should('have.text', before);
    });
  });

  it('asking for more than the stock warns while typing', () => {
    cy.loginAs('Staff');
    cy.visit('/orders');
    cy.pickProduct('#product-0', 'Wireless Mouse M200');
    cy.get('#quantity-0').clear().type('100000');
    cy.get('#quantity-0-error').should('contain', 'in stock');
    cy.contains('button', 'Send for approval').click();
    cy.get('#quantity-0').should('be.focused'); // nothing was sent, focus goes to the problem
  });
});
