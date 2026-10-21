// purchase requests (req 2.2.5, "inventory approval")
// Staff ask, a Manager approves or declines (declining needs a reason),
// Managers dont need approval for their own requests
describe('purchase requests (req 2.2.5)', () => {
  // FE-16
  it('FE-16 Staff sends a request and it waits for approval', () => {
    cy.loginAs('Staff');
    cy.contains('a', 'Requests').click();
    cy.contains('button', 'New request').click();
    cy.get('[role=dialog]').should('contain', 'A Manager will approve or decline it.');
    cy.pickProduct('#productId', 'Wireless Mouse M200');
    cy.get('#supplierId').selectByText('Northwind Electronics');
    cy.get('#quantity').type('40');
    cy.get('#note').type('weekend promotion');
    cy.get('[role=dialog]').contains('button', 'Send request').click();

    cy.get('[role=status]').should('contain', 'sent for approval');
    cy.contains('tr', 'weekend promotion').should('contain', 'Pending').and('contain', '40');
    cy.contains('button', 'Approve').should('not.exist'); // Staff cannot approve
  });

  // FE-17
  it('FE-17 a Manager approves a pending request from the dashboard banner', () => {
    cy.loginAs('Manager');
    cy.contains('waiting for your approval').parent().contains('a', 'Review').click();
    cy.contains('tr', 'weekend promotion').contains('button', 'Approve').click();
    cy.get('[role=status]').should('contain', 'approved');
    cy.contains('button', 'All').click();
    cy.contains('tr', 'weekend promotion').should('contain', 'Approved').and('contain', 'by Morgan Manager');
  });

  it('declining needs a reason, and the reason is shown', () => {
    cy.loginAs('Staff');
    cy.visit('/requests');
    cy.contains('button', 'New request').click();
    cy.pickProduct('#productId', 'USB-C Hub 7-Port');
    cy.get('#supplierId').selectByText('Acme Office Supply');
    cy.get('#quantity').type('500');
    cy.get('[role=dialog]').contains('button', 'Send request').click();
    cy.get('[role=status]').should('contain', 'sent for approval');

    cy.contains('button', 'Sign Out').click();
    cy.loginAs('Manager');
    cy.visit('/requests');
    cy.contains('tr', 'USB-C Hub 7-Port').contains('button', 'Decline').click();
    cy.get('[role=dialog]').contains('button', 'Decline request').click(); // no reason yet
    cy.get('#reason-error').should('contain', 'Write a reason');
    cy.get('#reason').should('be.focused').type('500 is too many, order 50');
    cy.get('[role=dialog]').contains('button', 'Decline request').click();
    cy.get('[role=status]').should('contain', 'declined');
    cy.contains('button', 'All').click();
    cy.contains('tr', 'USB-C Hub 7-Port').should('contain', 'Declined').and('contain', '500 is too many, order 50');
  });

  it("a Manager's own request needs no approval (and the dashboard can start it)", () => {
    cy.loginAs('Manager');
    cy.contains('h2', 'Needs attention').closest('section').contains('li', 'Mechanical Keyboard K1').contains('a', 'Order').click();
    cy.get('[role=dialog]').should('contain', 'this is approved right away');
    cy.get('#productId').should('have.value', 'Mechanical Keyboard K1');
    cy.get('#quantity').should('be.focused').type('30');
    cy.get('#supplierId').selectByText('Northwind Electronics');
    cy.get('[role=dialog]').contains('button', 'Order products').click();
    cy.get('[role=status]').should('contain', 'approved');
    cy.contains('button', 'All').click();
    cy.contains('tr', 'Mechanical Keyboard K1').should('contain', 'Approved');
  });
});
