// purchase requests (req 2.2.5, "inventory approval")
// Staff ask, a Manager approves or declines (declining needs a reason),
// Managers dont need approval for their own requests
describe('purchase requests (req 2.2.5)', () => {
  // FE-16
  it('FE-16 Staff sends a request and it waits for approval', () => {
    cy.loginAs('Staff');
    cy.contains('a', 'Requests').click();
    cy.contains('A Manager will approve or decline your request.');
    cy.get('#productId').selectByText('Wireless Mouse M200');
    cy.get('#supplierId').selectByText('Northwind Electronics');
    cy.get('#quantity').type('40');
    cy.get('#note').type('weekend promotion');
    cy.contains('button', 'Send request').click();

    cy.get('[role=status]').should('contain', 'sent for approval');
    cy.contains('h2', 'Waiting for approval').parent().contains('tr', 'Wireless Mouse M200').should('contain', '40');
    // Staff cannot approve
    cy.contains('button', 'Approve').should('not.exist');
  });

  // FE-17
  it('FE-17 a Manager approves a pending request', () => {
    cy.loginAs('Manager');
    // the dashboard tells the manager something is waiting
    cy.contains('waiting for your approval').parent().contains('a', 'Review').click();
    cy.contains('h2', 'Waiting for approval').parent().contains('tr', 'weekend promotion').contains('button', 'Approve').click();
    cy.get('[role=status]').should('contain', 'approved');
    cy.contains('h2', 'History').parent().contains('tr', 'Wireless Mouse M200').should('contain', 'Approved').and('contain', 'Morgan Manager');
  });

  it('declining needs a reason, and the reason is shown', () => {
    cy.loginAs('Staff');
    cy.visit('/requests');
    cy.get('#productId').selectByText('USB-C Hub 7-Port');
    cy.get('#supplierId').selectByText('Acme Office Supply');
    cy.get('#quantity').type('500');
    cy.contains('button', 'Send request').click();
    cy.get('[role=status]').should('contain', 'sent for approval');

    cy.contains('button', 'Sign Out').click();
    cy.loginAs('Manager');
    cy.visit('/requests');
    cy.contains('tr', 'USB-C Hub 7-Port').contains('button', 'Decline').click();
    cy.contains('button', 'Confirm decline').should('be.disabled'); // no reason yet
    cy.focused().type('500 is too many, order 50');
    cy.contains('button', 'Confirm decline').click();
    cy.get('[role=status]').should('contain', 'declined');
    cy.contains('h2', 'History').parent().contains('tr', 'USB-C Hub 7-Port')
      .should('contain', 'Declined').and('contain', '500 is too many, order 50');
  });

  it("a Manager's own request needs no approval", () => {
    cy.loginAs('Manager');
    cy.visit('/requests');
    cy.contains('your requests are approved right away');
    cy.get('#productId').selectByText('Mechanical Keyboard K1');
    cy.get('#supplierId').selectByText('Northwind Electronics');
    cy.get('#quantity').type('30');
    cy.contains('button', 'Order products').click();
    cy.get('[role=status]').should('contain', 'approved');
    cy.contains('h2', 'History').parent().contains('tr', 'Mechanical Keyboard K1').should('contain', 'Approved');
  });
});
