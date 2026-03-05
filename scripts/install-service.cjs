// Install DMS Node.js app as a Windows Service
// Run: node scripts/install-service.cjs

const path = require('path');
const { Service } = require('node-windows');

const svc = new Service({
  name: 'DMS Node Server',
  description: 'Document Management System - Node.js backend on port 5000',
  script: path.join(__dirname, '..', 'dist', 'app.js'),
  nodeOptions: [],
  workingDirectory: path.join(__dirname, '..', 'dist'),
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PORT', value: '5000' },
    { name: 'HOST', value: '0.0.0.0' },
    { name: 'DB_SERVER', value: process.env.DB_SERVER || 'WEB-APP-INSTANC' },
    { name: 'DB_PORT', value: process.env.DB_PORT || '1438' },
    { name: 'DB_USER', value: process.env.DB_USER || 'sa' },
    { name: 'DB_PASSWORD', value: process.env.DB_PASSWORD || 'Cybaem@123' },
    { name: 'DB_NAME', value: process.env.DB_NAME || 'DMS' },
    { name: 'PUPPETEER_EXECUTABLE_PATH', value: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }
  ]
});

svc.on('install', () => {
  console.log('Service installed successfully!');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started!');
  console.log('DMS is now running as a Windows service on port 5000');
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed. Starting it...');
  svc.start();
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

svc.install();
