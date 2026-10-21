describe('products (reqs 2.4.1, 2.5.1)', () => {
  // FE-03
  it('FE-03 Staff creates a product and it shows in the list', () => {
    const name = `Desk Lamp ${Date.now()}`; // unique, so the test can run again and again

    cy.loginAs('Staff');
    cy.contains('a', 'Products').click();
    cy.contains('button', 'New product').click();

    // the form opens in the side panel, the table stays on the page
    cy.get('[role=dialog]').should('contain', 'New product');
    cy.get('#productName').should('be.focused').type(name);
    cy.get('#description').type('Adjustable LED desk lamp');
    cy.get('#unitPrice').type('49.99');
    cy.get('#currentStock').type('75');
    cy.get('#reorderLevel').type('15');
    cy.contains('button', 'Create product').click();

    cy.get('[role=status]').should('contain', `Product "${name}" created.`);
    cy.get('[role=dialog]').should('not.exist');
    cy.contains('tr', name).should('contain', '$49.99').and('contain', '75');
  });

  it('a product without a name shows the error next to the field (UT-05)', () => {
    cy.loginAs('Staff');
    cy.visit('/products');
    cy.contains('button', 'New product').click();
    cy.get('#unitPrice').type('10');
    cy.get('#currentStock').type('1');
    cy.contains('button', 'Create product').click();
    cy.get('#productName-error').should('contain', 'Product name is required');
    cy.get('#productName').should('have.attr', 'aria-invalid', 'true').and('be.focused');
    // Escape closes the panel
    cy.get('body').type('{esc}');
    cy.get('[role=dialog]').should('not.exist');
  });
});
