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
  cy.contains('h1', 'Dashboard');
});

// picks the first <option> whose text contains the given words
// (option text also shows stock and price, so an exact match wont work)
Cypress.Commands.add('selectByText', { prevSubject: 'element' }, (select, text) => {
  cy.wrap(select)
    .find('option')
    .contains(text)
    .then((option) => cy.wrap(select).select(option.val()));
});

// a login token straight from the api, for preparing test data quickly (not for the ui itself)
Cypress.Commands.add('apiToken', (role) => {
  const { email, password } = ACCOUNTS[role];
  return cy.request('POST', '/api/auth/login', { email, password }).its('body.token');
});

// A11Y-01: runs axe-core (the WCAG checker named in the proposal) on the page as it is now and
// fails the test on any WCAG 2.1 A/AA problem, printing each one in the terminal
Cypress.Commands.add('checkPage', (name) => {
  cy.readFile('node_modules/axe-core/axe.min.js').then((source) => {
    cy.window({ log: false }).then((win) => {
      if (!win.axe) win.eval(source);
      return win.axe.run(win.document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] });
    });
  }).then((results) => {
    const problems = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`
    );
    if (problems.length) cy.task('log', `[a11y] ${name}:\n  ${problems.join('\n  ')}`);
    expect(problems, `accessibility problems on ${name}`).to.deep.equal([]);
  });
});
