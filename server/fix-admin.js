const pool = require('./db');

async function fixAdmin() {
  try {
    // 检查admin用户状态
    const result = await pool.query('SELECT id, username, enabled FROM users WHERE username = ?', ['admin']);
    const admin = result.rows[0];
    
    if (!admin) {
      console.log('❌ 管理员账户不存在');
      process.exit(1);
    }
    
    console.log('当前管理员状态:', {
      id: admin.id,
      username: admin.username,
      enabled: admin.enabled
    });
    
    if (admin.enabled === 0 || admin.enabled === false) {
      // 启用管理员账户
      await pool.run('UPDATE users SET enabled = 1 WHERE username = ?', ['admin']);
      console.log('✅ 管理员账户已重新启用！');
    } else {
      console.log('✅ 管理员账户已经是启用状态');
    }
    
    console.log('\n登录信息：');
    console.log('   用户名: admin');
    console.log('   密码: password');
    
  } catch (err) {
    console.error('❌ 操作失败:', err.message);
  } finally {
    await pool.end();
  }
}

fixAdmin();
