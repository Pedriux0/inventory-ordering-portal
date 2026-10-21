// demo accounts created by db/seed.js
const ACCOUNTS = {
  Admin: { email: 'admin@demo.com', password: 'DemoAdminPass2026' },
  Manager: { email: 'manager@demo.com', password: 'DemoManagerPass2026' },
  Staff: { email: 'staff@demo.com', password: 'DemoStaffPass2026' },
};

// logs in through the real login form, the same way a user would
Cypress.Commands.add('loginAs', (role) => {
  const { email, password } = ACCOUNTS[role];
  cy.visit('/login');
  cy.get('#email').type(email);
  cy.get('#password').type(password, { log: false });
  cy.contains('button', 'Sign in').click();
  // logged in = the top bar shows the role
  cy.get('[data-cy=user-role]').should('have.text', role);
});

// picks the first <option> whose text contains the given words
// (option text also shows stock and price, so an exact match wont work)
Cypress.Commands.add('selectByText', { prevSubject: 'element' }, (select, text) => {
  cy.wrap(select)
    .find('option')
    .contains(text)
    .then((option) => cy.wrap(select).select(option.val()));
});

// types into the searchable product picker and clicks the matching option
// usage: cy.pickProduct('#product-0', 'Notebook A5 Dotted')
Cypress.Commands.add('pickProduct', (selector, name) => {
  cy.get(selector).clear().type(name);
  cy.get(`${selector}-listbox`).contains('[role=option]', name).click();
  cy.get(selector).should('have.value', name);
});
