const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('./database.db');

async function resetAdminPassword() {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password', saltRounds);

    // 检查admin用户是否存在
    const adminCheck = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');

    if (!adminCheck) {
      // 创建新管理员
      const adminId = Date.now().toString();
      db.prepare('INSERT INTO users (id, username, password, role, enabled) VALUES (?, ?, ?, ?, ?)')
        .run(adminId, 'admin', hashedPassword, 'admin', 1);
      console.log('✅ 管理员账户创建成功！');
    } else {
      // 重置密码
      db.prepare('UPDATE users SET password = ? WHERE username = ?')
        .run(hashedPassword, 'admin');
      console.log('✅ 管理员密码重置成功！');
    }

    console.log('   用户名: admin');
    console.log('   密码: password');
  } catch (err) {
    console.error('❌ 重置失败:', err.message);
  } finally {
    db.close();
  }
}

resetAdminPassword();
