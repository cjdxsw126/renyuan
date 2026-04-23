const express = require('express');
const app = express();

app.use(express.json());

console.log('Loading auth routes...');
const authRoutes = require('./routes/auth');
console.log('Auth routes loaded');

app.use('/api/auth', authRoutes);

// 中间件：打印所有请求
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// 404 处理
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).send('Not found');
});

const server = app.listen(3002, () => {
  console.log('Debug server on port 3002');
});

// 测试请求
setTimeout(() => {
  const http = require('http');
  
  const testRequest = (path, method = 'POST') => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`${method} ${path} - Status: ${res.statusCode}`);
    });

    req.on('error', (e) => {
      console.error(`${method} ${path} - Error: ${e.message}`);
    });

    if (method === 'POST') {
      req.write(JSON.stringify({ username: 'test', oldPassword: 'test', newPassword: 'test' }));
    }
    req.end();
  };

  testRequest('/api/auth/login');
  testRequest('/api/auth/change-password');
  
  setTimeout(() => {
    server.close();
    process.exit(0);
  }, 1000);
}, 1000);
