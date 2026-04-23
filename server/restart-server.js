// 清除 require 缓存并重启
const path = require('path');

// 清除所有可能的缓存
Object.keys(require.cache).forEach(key => {
  if (key.includes('routes') || key.includes('auth')) {
    delete require.cache[key];
    console.log('Cleared cache:', key);
  }
});

// 重新加载并启动
const app = require('./app');
