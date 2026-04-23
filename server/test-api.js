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

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(postData);
req.end();
