import { defineConfig } from 'cypress'

// front-end functional tests (proposal section 4.3, tool: Cypress)
// needs the api + react app running and the demo data loaded (npm run seed)
// point it somewhere else with: CYPRESS_BASE_URL=http://localhost:5174 npm run test:e2e
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280, // desktop size used by the mockups
    viewportHeight: 800,
    video: false,
  },
})
