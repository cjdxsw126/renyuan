const pool = require('./db');
const bcrypt = require('bcrypt');

async function checkAdmin() {
  try {
    // 检查admin用户
    const result = await pool.query('SELECT id, username, password, enabled, role FROM users WHERE username = ?', ['admin']);
    const admin = result.rows[0];
    
    if (!admin) {
      console.log('❌ 管理员账户不存在');
      process.exit(1);
    }
    
    console.log('管理员信息:', {
      id: admin.id,
      username: admin.username,
      enabled: admin.enabled,
      role: admin.role,
      passwordHash: admin.password ? admin.password.substring(0, 20) + '...' : 'null'
    });
    
    // 验证密码
    const testPassword = 'password';
    const passwordMatch = await bcrypt.compare(testPassword, admin.password);
    console.log('\n密码验证结果:', passwordMatch);
    
    if (passwordMatch) {
      console.log('✅ 密码正确！');
    } else {
      console.log('❌ 密码不匹配！');
      console.log('\n正在重置密码...');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('password', saltRounds);
      await pool.run('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, 'admin']);
      console.log('✅ 密码已重置为: password');
    }
    
  } catch (err) {
    console.error('❌ 操作失败:', err.message);
  } finally {
    await pool.end();
  }
}

checkAdmin();
