describe('suppliers (reqs 2.2.5, 2.4.4, 2.5.6)', () => {
  // FE-05
  it('FE-05 Manager creates a supplier and it shows in the list', () => {
    const name = `Global Parts ${Date.now()}`;

    cy.loginAs('Manager');
    cy.contains('a', 'Suppliers').click();
    cy.contains('button', 'New supplier').click();
    cy.get('#supplierName').type(name);
    cy.get('#contactEmail').type('orders@globalparts.com');
    cy.get('#contactPhone').type('+1 555 777 1234');
    cy.contains('button', 'Create supplier').click();

    cy.get('[role=status]').should('contain', `Supplier "${name}" created.`);
    cy.contains('tr', name).should('contain', 'orders@globalparts.com').and('contain', 'Active');

    // deactivate, then undo it from the message
    cy.contains('tr', name).contains('button', 'Deactivate').click();
    cy.contains('tr', name).should('contain', 'Inactive');
    cy.get('[role=status]').contains('button', 'Undo').click();
    cy.contains('tr', name).should('not.contain', 'Inactive');

    // and deactivate it for good, so test runs dont pile up active suppliers
    cy.contains('tr', name).contains('button', 'Deactivate').click();
    cy.contains('tr', name).should('contain', 'Inactive');
  });

  it('Staff can see suppliers but has no buttons to change them', () => {
    cy.loginAs('Staff');
    cy.visit('/suppliers');
    cy.contains('tr', 'Acme Office Supply');
    cy.contains('button', 'New supplier').should('not.exist');
    cy.contains('button', 'Deactivate').should('not.exist');
  });
});
