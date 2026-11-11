// Milestone 1 screens: the Profile page (reqs 2.3.1 - 2.3.3)
describe('profile', () => {
  // FE-09
  it('FE-09 view and update your profile: the new name shows everywhere', () => {
    cy.loginAs('Staff');
    cy.contains('a', 'Profile').click();
    cy.get('[data-cy=profile-name]').should('have.text', 'Maria Garcia');
    cy.get('#profileName').clear().type('Maria G. Lopez');
    cy.contains('button', 'Save details').click();
    cy.get('[role=status]').should('contain', 'Your details were updated.');
    cy.get('[data-cy=profile-name]').should('have.text', 'Maria G. Lopez');
    cy.get('.user-name').should('have.text', 'Maria G. Lopez'); // top bar too
    // put the demo name back
    cy.get('#profileName').clear().type('Maria Garcia');
    cy.contains('button', 'Save details').click();
    cy.get('[data-cy=profile-name]').should('have.text', 'Maria Garcia');
  });

  // FE-14
  it('FE-14 change password: success, and you can log in again with the new one', () => {
    const stamp = Date.now().toString(36);
    const email = `fe-pass-${stamp}@test.local`;
    const oldPassword = 'FirstPasswordTest2026';
    const newPassword = 'SecondPasswordTest2026';
    cy.apiToken('Admin').then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/users',
        headers: { Authorization: `Bearer ${token}` },
        body: { fullName: 'Password Test', email, password: oldPassword, role: 'Staff' },
      });
    });

    const login = (password) => {
      cy.visit('/login');
      cy.get('#email').type(email);
      cy.get('#password').type(password, { log: false });
      cy.contains('button', 'Sign in').click();
    };

    login(oldPassword);
    cy.get('[data-cy=user-role]').should('have.text', 'Staff'); // logged in
    cy.visit('/profile');
    cy.get('#currentPassword').type(oldPassword);
    cy.get('#newPassword').type(newPassword);
    cy.get('#confirmPassword').type(newPassword);
    cy.contains('button', 'Change password').click();
    cy.get('[role=status]').should('contain', 'Password changed');

    cy.contains('button', 'Sign Out').click();
    login(oldPassword);
    cy.get('[role=alert]').should('contain', 'Invalid email or password'); // the old one stopped working
    cy.get('#email').clear();
    cy.get('#password').clear();
    login(newPassword);
    cy.get('[data-cy=user-role]').should('have.text', 'Staff'); // the new one works
  });

  it('a wrong current password is refused with a clear message', () => {
    cy.loginAs('Staff');
    cy.visit('/profile');
    cy.get('#currentPassword').type('NotMyPasswordAtAll1');
    cy.get('#newPassword').type('AnotherPassword2026');
    cy.get('#confirmPassword').type('AnotherPassword2026');
    cy.contains('button', 'Change password').click();
    cy.get('[role=alert]').should('contain', 'Current password is incorrect');
  });
});
