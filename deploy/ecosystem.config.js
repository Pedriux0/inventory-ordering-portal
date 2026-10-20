// PM2 keeps the express api running and restarts it if it crashes or the server reboots
// start with: pm2 start deploy/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'inventory-portal-api',
      script: 'src/server.js',
      cwd: '/var/www/inventory-portal',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
