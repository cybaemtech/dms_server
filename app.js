// IIS Node.js entry point - runs from inside dist folder on the server
// Start the Express server which serves both API and static files

import('./index.js')
    .then(() => {
        console.log('DMS Server started successfully');
    })
    .catch((err) => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
