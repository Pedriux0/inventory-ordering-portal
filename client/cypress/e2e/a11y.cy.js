// accessibility tests (proposal section 4.5, tool: axe-core, reqs 3.3.1 and 3.3.2)
const PAGES = ['/', '/products', '/orders', '/inventory', '/suppliers', '/requests', '/users', '/profile'];

// the page is still usable: nothing sticks out sideways (no horizontal page scroll)
// and the main heading is on screen
function expectNoOverflow(page) {
  cy.document().then((doc) => {
    const overflow = doc.documentElement.scrollWidth - doc.documentElement.clientWidth;
    expect(overflow, `content wider than the screen on ${page}`).to.be.at.most(1);
  });
  cy.get('h1').should('be.visible');
}

describe('A11Y-01 color contrast and WCAG checks on all pages (WCAG 1.4.3, req 3.3.1)', () => {
  it('A11Y-01 the login page passes axe-core', () => {
    cy.visit('/login');
    cy.checkPage('login');
    cy.get('#email').type('nobody@test.local');
    cy.get('#password').type('wrong');
    cy.contains('button', 'Sign in').click();
    cy.get('[role=alert]');
    cy.checkPage('login with an error message');
  });

  it('A11Y-01 every page passes axe-core (as Admin, who can open them all)', () => {
    cy.loginAs('Admin');
    PAGES.forEach((page) => {
      cy.visit(page);
      cy.get('h1');
      cy.contains(/Loading/).should('not.exist');
      cy.checkPage(page);
    });
  });

  // the redesign has a dark theme: its colors must pass the contrast checks too
  it('A11Y-01 every page passes axe-core in dark mode', () => {
    cy.loginAs('Admin');
    PAGES.forEach((page) => {
      cy.visit(page, { onBeforeLoad: (win) => win.localStorage.setItem('portal_theme', 'dark') });
      cy.get('html').should('have.attr', 'data-theme', 'dark');
      cy.get('h1');
      cy.contains(/Loading/).should('not.exist');
      cy.checkPage(`${page} (dark)`);
    });
  });

  it('A11Y-01 forms, messages and the 403 page pass axe-core', () => {
    cy.loginAs('Admin');
    cy.visit('/products');
    cy.contains('button', 'New product').click();
    cy.contains('button', 'Create product').click(); // shows an error message
    cy.checkPage('product form with an error');
    cy.visit('/users');
    cy.contains('button', 'New account').click();
    cy.checkPage('new account form');
    cy.contains('button', 'Sign Out').click();
    cy.loginAs('Staff');
    cy.visit('/users');
    cy.contains('h1', 'Access denied');
    cy.checkPage('403 page');
  });
});

describe('A11Y-02 text resized to 200% (WCAG 1.4.4, req 3.3.2)', () => {
  it('A11Y-02 with the text at 200% every page still fits and works', () => {
    cy.loginAs('Admin');
    PAGES.forEach((page) => {
      cy.visit(page);
      cy.get('h1');
      cy.document().then((doc) => {
        doc.documentElement.style.fontSize = '200%'; // browser "text size 200%"
      });
      expectNoOverflow(page);
    });
  });

  it('A11Y-02 with the whole page zoomed to 200% (a 1280px screen becomes 640px) every page fits', () => {
    cy.viewport(640, 400);
    cy.loginAs('Admin');
    PAGES.forEach((page) => {
      cy.visit(page);
      expectNoOverflow(page);
    });
    cy.visit('/login');
  });
});

// A11Y-03 has two parts. Real Tab key presses do not reach the app in headless Cypress (the
// browser window never gets keyboard focus), so the real "press Tab through every page" test runs
// in a11y/run-a11y.js with Puppeteer. This part checks the same elements from inside the page:
// every control is focusable, in the normal tab order, and shows where the focus is.
describe('A11Y-03 keyboard navigation (req 3.3.1)', () => {
  // every visible link, button and form field on the page
  const controlsOf = (doc) =>
    [...doc.querySelectorAll('a[href], button, input, select, textarea')].filter(
      (el) => !el.disabled && el.offsetParent !== null
    );

  it('A11Y-03 every control is in the tab order and shows a visible focus outline', () => {
    cy.loginAs('Admin');
    ['/', '/products', '/orders', '/inventory', '/suppliers', '/requests', '/users', '/profile'].forEach((page) => {
      cy.visit(page);
      cy.get('h1');
      cy.contains(/Loading/).should('not.exist');
      cy.document().then((doc) => {
        const problems = [];
        controlsOf(doc).forEach((el) => {
          const name = el.outerHTML.slice(0, 70);
          if (el.tabIndex < 0) problems.push(`not in tab order: ${name}`);
          el.focus();
          if (doc.activeElement !== el) problems.push(`cannot get focus: ${name}`);
          // the focus must be visible (WCAG 2.4.7): an outline or a ring around the element
          const style = doc.defaultView.getComputedStyle(el);
          const visible = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
          if (!visible) problems.push(`no visible focus: ${name}`);
        });
        // a positive tabindex would change the natural order, which confuses keyboard users
        doc.querySelectorAll('[tabindex]').forEach((el) => {
          if (el.tabIndex > 0) problems.push(`positive tabindex: ${el.outerHTML.slice(0, 70)}`);
        });
        expect(problems, `keyboard problems on ${page}`).to.deep.equal([]);
      });
    });
  });

  it('A11Y-03 a form can be filled from the keyboard and sent with Enter', () => {
    const name = `Keyboard product ${Date.now().toString(36)}`;
    cy.loginAs('Staff');
    cy.visit('/products');
    // (opening it with Enter on the button is checked with real key presses in a11y/run-a11y.js)
    cy.contains('button', 'New product').click();
    cy.get('#productName').focus().type(name);
    cy.get('#unitPrice').focus().type('12.50');
    cy.get('#currentStock').focus().type('7{enter}'); // Enter in a field sends the form
    cy.get('[role=status]').should('contain', `Product "${name}" created.`);
  });
});
