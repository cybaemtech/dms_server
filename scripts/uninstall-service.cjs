// Uninstall DMS Node.js Windows Service
// Run: node scripts/uninstall-service.cjs

const path = require('path');
const { Service } = require('node-windows');

const svc = new Service({
  name: 'DMS Node Server',
  script: path.join(__dirname, '..', 'dist', 'app.js'),
});

svc.on('uninstall', () => {
  console.log('Service uninstalled successfully!');
});

svc.uninstall();
