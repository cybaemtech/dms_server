
const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/documents/doc-1773133283925/pdf?userId=issuer-1',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.log('RESPONSE:', data);
    } else {
      console.log(`Received PDF data: ${data.length} bytes`);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
