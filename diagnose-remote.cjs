#!/usr/bin/env node
/**
 * 详细诊断远程后端登录失败原因
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
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
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

async function diagnose() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         🔍 远程后端详细诊断工具                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 测试 1：健康检查
  console.log('📋 [1/4] 健康检查测试');
  try {
    const healthRes = await makeRequest('https://xuanren-1.onrender.com/api/health');
    console.log(`   状态码: ${healthRes.status} ${healthRes.statusMessage}`);
    console.log(`   响应体: ${healthRes.body}`);
    console.log(`   ✅ 结果: ${healthRes.status === 200 ? '正常' : '异常'}\n`);
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}\n`);
  }

  // 测试 2：用户列表（验证数据库连接）
  console.log('📋 [2/4] 用户列表测试（验证数据库）');
  try {
    const usersRes = await makeRequest('https://xuanren-1.onrender.com/api/users');
    const usersData = JSON.parse(usersRes.body);
    console.log(`   状态码: ${usersRes.status} ${usersRes.statusMessage}`);
    console.log(`   用户数量: ${usersData.length}`);
    if (usersData.length > 0) {
      console.log(`   第一个用户: ${usersData[0].username} (ID类型: ${typeof usersData[0].id})`);
    }
    console.log(`   ✅ 数据库连接正常\n`);
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}\n`);
  }

  // 测试 3：登录接口（主要问题）
  console.log('📋 [3/4] 登录接口测试（重点诊断）');
  try {
    const loginRes = await makeRequest('https://xuanren-1.onrender.com/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password' })
    });
    
    console.log(`   状态码: ${loginRes.status} ${loginRes.statusMessage}`);
    console.log(`   Content-Type: ${loginRes.headers['content-type']}`);
    console.log(`   响应体: ${loginRes.body}`);
    
    if (loginRes.status === 500) {
      console.log(`\n   ⚠️  500 错误分析:`);
      console.log(`   - 后端代码抛出了未处理的异常`);
      console.log(`   - 可能原因:`);
      console.log(`     1. 数据库表结构不匹配（SERIAL vs TEXT）`);
      console.log(`     2. 缺少必要的表或列`);
      console.log(`     3. 权限表数据不存在`);
      console.log(`     4. PostgreSQL 语法错误`);
    } else if (loginRes.status === 200) {
      console.log(`   ✅ 登录成功！`);
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}\n`);
  }

  // 测试 4：权限表数据检查
  console.log('📋 [4/4] 权限表数据检查');
  try {
    // 尝试直接查询权限表（如果有的话）
    console.log('   提示: 需要检查 permissions 表是否有 admin 用户的记录');
    console.log('   如果权限表为空，会导致登录时 500 错误\n');
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}\n`);
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    📊 诊断完成                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log('💡 建议操作:');
  console.log('   1. 在 Render Dashboard 查看 Deploy Logs');
  console.log('   2. 查找 "❌" 或 "Error" 关键字');
  console.log('   3. 或者手动删除 PostgreSQL 数据库重建');
}

diagnose().catch(console.error);