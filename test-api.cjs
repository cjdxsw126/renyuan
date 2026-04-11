#!/usr/bin/env node
/**
 * 测试后端 API 连接和登录功能
 * 运行: node test-api.js
 */

const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAPI() {
  console.log('\n========================================');
  console.log('🔍 开始测试后端 API...');
  console.log('========================================\n');

  // 测试 1：健康检查
  console.log('📋 测试 1: 健康检查 (/api/health)');
  try {
    const healthRes = await makeRequest('https://xuanren-1.onrender.com/api/health');
    console.log(`   状态码: ${healthRes.status}`);
    console.log(`   响应体: ${healthRes.body}`);
    console.log(`   ✅ 结果: ${healthRes.status === 200 ? '正常' : '异常'}\n`);
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}\n`);
  }

  // 测试 2：登录接口
  console.log('📋 测试 2: 登录接口 (/api/auth/login)');
  try {
    const loginRes = await makeRequest('https://xuanren-1.onrender.com/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password' })
    });
    console.log(`   状态码: ${loginRes.status}`);
    console.log(`   响应体: ${loginRes.body}`);
    
    if (loginRes.status === 200) {
      console.log('   ✅ 结果: 登录成功！\n');
    } else if (loginRes.status === 500) {
      console.log('   ❌ 结果: 服务器内部错误 - 后端代码有问题\n');
    } else if (loginRes.status === 401) {
      console.log('   ⚠️ 结果: 用户名或密码错误\n');
    } else {
      console.log(`   ⚠️ 结果: 未知状态\n`);
    }
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}\n`);
  }

  // 测试 3：获取用户列表
  console.log('📋 测试 3: 获取用户列表 (/api/users)');
  try {
    const usersRes = await makeRequest('https://xuanren-1.onrender.com/api/users');
    console.log(`   状态码: ${usersRes.status}`);
    console.log(`   响应体: ${usersRes.body.substring(0, 200)}...\n`);
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}\n`);
  }

  console.log('========================================');
  console.log('✅ 测试完成！');
  console.log('========================================\n');
}

testAPI().catch(console.error);