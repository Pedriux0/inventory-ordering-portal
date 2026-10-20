describe('inventory (reqs 2.5.2, 2.5.4)', () => {
  // FE-11
  it('FE-11 shows every product with its stock', () => {
    cy.loginAs('Staff');
    cy.contains('a', 'Inventory').click();
    cy.contains('h2', 'Current stock');
    cy.contains('tr', 'Notebook A5 Dotted').find('[data-cy=stock]').invoke('text').should('match', /^\d+$/);
  });

  // FE-10
  it('FE-10 recording a receipt updates the stock', () => {
    cy.loginAs('Staff');
    cy.visit('/inventory');

    // read the stock before, then receive 25 and expect it to be 25 higher
    cy.contains('tr', 'Notebook A5 Dotted')
      .find('[data-cy=stock]')
      .invoke('text')
      .then((text) => {
        const before = Number(text);

        cy.get('#productId').selectByText('Notebook A5 Dotted');
        cy.get('#supplierId').selectByText('Acme Office Supply');
        cy.get('#quantity').type('25');
        cy.contains('button', 'Record receipt').click();

        cy.get('[role=status]').should('contain', `Stock is now ${before + 25}`);
        cy.contains('tr', 'Notebook A5 Dotted').find('[data-cy=stock]').should('have.text', String(before + 25));
      });
  });
});
