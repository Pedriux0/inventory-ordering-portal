// reads the number in the "Stock" column for one product
const stockOf = (name) => cy.contains('tr', name).find('[data-cy=stock]').invoke('text').then(Number);

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

    stockOf('Notebook A5 Dotted').then((before) => {
      cy.contains('button', 'Receive stock').click();
      cy.pickProduct('#productId', 'Notebook A5 Dotted');
      cy.get('#supplierId').selectByText('Acme Office Supply');
      cy.get('#quantity').type('25');
      // the panel previews the result before saving
      cy.get('.preview').should('contain', String(before)).and('contain', String(before + 25));
      cy.contains('button', 'Record receipt').click();

      cy.get('[role=status]').should('contain', `Stock is now ${before + 25}`);
      cy.contains('tr', 'Notebook A5 Dotted').find('[data-cy=stock]').should('have.text', String(before + 25));
    });
  });

  it('the dashboard "Receive" button opens the panel with the product already chosen', () => {
    cy.loginAs('Manager');
    cy.contains('h2', 'Needs attention')
      .closest('section')
      .find('li')
      .first()
      .then(($item) => {
        const name = $item.find('.cell-title').text();
        cy.wrap($item).contains('a', 'Receive').click();
        cy.location('pathname').should('eq', '/inventory');
        cy.get('[role=dialog]').should('contain', 'Receive stock');
        cy.get('#productId').should('have.value', name);
        cy.get('#quantity').should('be.focused');
      });
  });

  it('the "Needs reorder" filter shows only low stock products', () => {
    cy.loginAs('Staff');
    cy.visit('/inventory');
    cy.contains('button', 'Needs reorder').click();
    cy.location('search').should('eq', '?filter=low');
    cy.contains('h2', 'Current stock').closest('section').find('tbody tr').each(($row) => {
      cy.wrap($row).find('.badge').should('exist'); // every row left is Low or Critical
    });
  });
});
