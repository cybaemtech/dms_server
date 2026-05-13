const http = require('http');

// Test different API endpoints to understand authentication
async function testAPIs() {
  const endpoints = [
    '/api/version',
    '/api/departments',
    '/api/admin/stats',
    '/api/admin/revision-activities',
  ];
  
  for (const endpoint of endpoints) {
    await new Promise((resolve) => {
      console.log(`\n🔍 Testing ${endpoint}...`);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        console.log(`📊 ${endpoint} - Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (res.statusCode === 200) {
              console.log(`✅ Success:`, Object.keys(jsonData));
            } else {
              console.log(`❌ Error:`, jsonData.message || jsonData);
            }
          } catch (error) {
            console.log(`📄 Raw response (first 200 chars):`, data.substring(0, 200));
          }
          resolve();
        });
      });

      req.on('error', (error) => {
        console.error(`❌ ${endpoint} - Request Error:`, error.message);
        resolve();
      });

      req.setTimeout(5000);
      req.end();
    });
  }
}

testAPIs();
