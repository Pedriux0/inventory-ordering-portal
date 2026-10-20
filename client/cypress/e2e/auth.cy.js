describe('login (req 2.1.1)', () => {
  // FE-01
  it('FE-01 valid credentials go to the dashboard', () => {
    cy.loginAs('Staff');
    cy.location('pathname').should('eq', '/');
    cy.get('[data-cy=user-role]').should('have.text', 'Staff');
  });

  // FE-02
  it('FE-02 a wrong password shows an error message', () => {
    cy.visit('/login');
    cy.get('#email').type('staff@demo.com');
    cy.get('#password').type('WrongPassword1234');
    cy.contains('button', 'Sign in').click();
    cy.get('[role=alert]').should('contain', 'Invalid email or password');
    cy.location('pathname').should('eq', '/login');
  });
});
