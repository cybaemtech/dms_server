const http = require('http');

// Test the revision activities endpoint
function testRevisionAPI() {
  console.log('🔍 Testing revision activities API...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/revision-activities?limit=10',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('📊 API Response:', JSON.stringify(jsonData, null, 2));
        console.log(`\n🔢 Total Revisions: ${jsonData.totalRevisions || 0}`);
        console.log(`📝 Activities Count: ${jsonData.activities?.length || 0}`);
        
        if (jsonData.activities && jsonData.activities.length > 0) {
          console.log('\n📋 Sample revision:');
          const sample = jsonData.activities[0];
          console.log(`- Document: ${sample.docName} (${sample.docNumber})`);
          console.log(`- Revision: v${sample.revisionNo}`);
          console.log(`- Status: ${sample.status}`);
          console.log(`- Reason: ${sample.reasonForRevision || 'No reason provided'}`);
          console.log(`- Prepared by: ${sample.preparerName}`);
        }
      } catch (error) {
        console.error('❌ JSON Parse Error:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server may not be running. Try starting it with: node app.js');
    }
  });

  req.on('timeout', () => {
    console.error('⏰ Request timeout');
    req.destroy();
  });

  req.setTimeout(10000); // 10 second timeout
  req.end();
}

testRevisionAPI();
