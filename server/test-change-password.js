const http = require('http');

const postData = JSON.stringify({
  username: 'admin',
  oldPassword: 'password',
  newPassword: 'newpass123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/change-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response body:', data);
    try {
      const json = JSON.parse(data);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Not valid JSON - received HTML or error page');
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();
