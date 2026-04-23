const express = require('express');
const app = express();

app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 打印所有注册的路由
function printRoutes(stack, basePath = '') {
  stack.forEach((middleware) => {
    if (middleware.route) {
      // 这是一个路由
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${basePath}${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // 这是一个子路由器
      const newBase = basePath + (middleware.regexp.toString().includes('api/auth') ? '/api/auth' : '');
      printRoutes(middleware.handle.stack, newBase);
    }
  });
}

console.log('Registered routes:');
printRoutes(app._router.stack);
