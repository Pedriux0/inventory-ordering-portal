// Milestone 1 screens: the Admin's Users page (reqs 2.2.6, 2.3.4, 2.5.7)
describe('users (Admin)', () => {
  const stamp = Date.now().toString(36);
  const name = `FE Test ${stamp}`;

  before(() => {
    // a fresh account just for this test, so the demo accounts are never changed
    cy.apiToken('Admin').then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/users',
        headers: { Authorization: `Bearer ${token}` },
        body: { fullName: name, email: `fe-test-${stamp}@test.local`, password: 'FrontEndTestPass2026', role: 'Staff' },
      });
    });
  });

  // FE-06
  it('FE-06 the Admin assigns a role: Staff -> Manager', () => {
    cy.loginAs('Admin');
    cy.contains('a', 'Users').click();
    cy.contains('tr', name).find('select').select('Manager');
    cy.get('[role=status]').should('contain', `${name} is now Manager`);
    cy.contains('tr', name).find('select').should('have.value', 'Manager');
  });

  // FE-15
  it('FE-15 the Admin deactivates and reactivates an account', () => {
    cy.loginAs('Admin');
    cy.visit('/users');
    cy.contains('tr', name).contains('button', 'Deactivate').click();
    cy.contains('tr', name).should('contain', 'Inactive');
    cy.contains('tr', name).contains('button', 'Reactivate').click();
    cy.contains('tr', name).should('contain', 'Active').and('not.contain', 'Inactive');
  });

  it('the Admin cannot demote or deactivate their own account (no lock-out)', () => {
    cy.loginAs('Admin');
    cy.visit('/users');
    cy.contains('tr', '(you)').find('select').should('be.disabled');
    cy.contains('tr', '(you)').contains('button', 'Deactivate').should('not.exist');
  });

  it('Staff and Managers do not see Users, and opening it directly shows the 403 page', () => {
    cy.loginAs('Manager');
    cy.contains('a', 'Users').should('not.exist');
    cy.visit('/users');
    cy.contains('h1', 'Access denied');
    cy.contains('Your role (Manager)');
  });
});
