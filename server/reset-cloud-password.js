const { Client } = require('pg');
const bcrypt = require('bcrypt');

// 从环境变量获取数据库连接字符串
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('错误：没有找到 DATABASE_URL 环境变量');
  console.log('请在 Render 控制台中添加 DATABASE_URL 环境变量');
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function resetPassword() {
  try {
    await client.connect();
    console.log('✅ 已连接到云端数据库');

    // 生成新的密码哈希
    const saltRounds = 10;
    const newPassword = 'password';
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新管理员密码
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING *',
      [hashedPassword, 'admin']
    );

    if (result.rowCount > 0) {
      console.log('✅ 管理员密码重置成功！');
      console.log('   用户名: admin');
      console.log('   密码: password');
    } else {
      console.log('❌ 未找到管理员用户');
    }

    // 显示所有用户
    const usersResult = await client.query('SELECT id, username, role, enabled FROM users');
    console.log('\n当前用户列表:');
    usersResult.rows.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - ${user.enabled ? '启用' : '禁用'}`);
    });

  } catch (error) {
    console.error('❌ 重置密码失败:', error.message);
  } finally {
    await client.end();
  }
}

resetPassword();
