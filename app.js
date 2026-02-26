// cPanel Node.js entry point
// This file should be set as the "Application Startup File" in cPanel's "Setup Node.js App"

import('./dist/index.js')
    .then(() => {
        console.log('Server started successfully');
    })
    .catch((err) => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
