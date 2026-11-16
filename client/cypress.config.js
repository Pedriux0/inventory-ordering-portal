import { defineConfig } from 'cypress'

// front-end functional tests (proposal section 4.3, tool: Cypress)
// + accessibility tests (section 4.5, axe-core) in cypress/e2e/a11y.cy.js
// needs the api + react app running and the demo data loaded (npm run seed)
// point it somewhere else with: CYPRESS_BASE_URL=http://localhost:5174 npm run test:e2e
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280, // desktop size used by the mockups
    viewportHeight: 800,
    video: false,
    setupNodeEvents(on) {
      // lets a test print to the terminal (used to list accessibility problems)
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
  },
})
