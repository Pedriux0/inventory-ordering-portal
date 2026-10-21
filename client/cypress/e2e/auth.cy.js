describe('login (req 2.1.1)', () => {
  // FE-01
  it('FE-01 valid credentials go to the dashboard', () => {
    cy.loginAs('Staff');
    cy.location('pathname').should('eq', '/');
    cy.contains('h1', 'Maria'); // "Good morning, Maria" style greeting
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

  it('the theme toggle switches to dark mode and remembers it', () => {
    cy.visit('/login');
    cy.window().then((win) => win.localStorage.setItem('portal_theme', 'light'));
    cy.reload();
    cy.get('html').should('have.attr', 'data-theme', 'light');
    cy.get('[aria-label="Switch to dark mode"]').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.reload();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('[aria-label="Switch to light mode"]').click(); // leave it as it was
  });
});
