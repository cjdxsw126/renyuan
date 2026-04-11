const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 临时修复端点 - 确保所有必要数据存在
app.get('/api/emergency-fix', async (req, res) => {
  try {
    console.log('\n🚨 执行紧急修复...\n');
    const results = {};

    // 1. 检查并修复 admin 用户
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    results.adminUser = userCheck.rows.length > 0;
    
    if (userCheck.rows.length === 0) {
      // 创建 admin 用户
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password', 10);
      const adminId = 'admin-' + Date.now();
      
      await pool.query(
        'INSERT INTO users (id, username, password, role, enabled) VALUES ($1, $2, $3, $4, $5)',
        [adminId, 'admin', hashedPassword, 'admin', 1]
      );
      results.createdAdmin = true;
      results.adminId = adminId;
    } else {
      results.adminId = userCheck.rows[0].id;
    }

    // 2. 检查并修复 permissions
    const permCheck = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [results.adminId]);
    results.hasPermission = permCheck.rows.length > 0;

    if (permCheck.rows.length === 0) {
      // 创建权限记录
      await pool.query(
        `INSERT INTO permissions (id, user_id, file_upload, search, download, admin_panel, data_delete) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['perm-' + results.adminId, results.adminId, 1, 1, 1, 1, 1]
      );
      results.createdPermission = true;
      console.log('✅ 权限记录已创建');
    } else {
      // 更新现有权限（确保所有权限都是开启的）
      await pool.query(
        `UPDATE permissions SET file_upload = 1, search = 1, download = 1, admin_panel = 1, data_delete = 1 WHERE user_id = $1`,
        [results.adminId]
      );
      results.updatedPermission = true;
      console.log('✅ 权限记录已更新');
    }

    // 3. 检查表结构
    try {
      const tableInfo = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('persons', 'certificates') 
        AND column_name = 'id'
        ORDER BY table_name, ordinal_position
      `);
      results.tableStructure = tableInfo.rows;
    } catch (e) {
      results.tableError = e.message;
    }

    // 4. 尝试 ALTER TABLE（如果需要）
    try {
      await pool.query(`ALTER TABLE persons ALTER COLUMN id TYPE TEXT USING id::TEXT`);
      results.alteredPersonsId = true;
    } catch (e) {
      results.alteredPersonsId = false;
      results.personsError = e.message;
    }

    try {
      await pool.query(`ALTER TABLE certificates ALTER COLUMN person_id TYPE TEXT USING person_id::TEXT`);
      results.alteredCertsPersonId = true;
    } catch (e) {
      results.alteredCertsPersonId = false;
      results.certsError = e.message;
    }

    console.log('\n🎉 紧急修复完成！');
    console.log('结果:', JSON.stringify(results, null, 2));
    
    res.json({
      success: true,
      message: '紧急修复完成',
      timestamp: new Date().toISOString(),
      ...results
    });
    
  } catch (error) {
    console.error('❌ 紧急修复失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// 测试登录
app.post('/api/test-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`\n🔐 测试登录: ${username}`);
    
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    console.log(`   找到用户: ${userResult.rows.length > 0 ? '是' : '否'}`);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    const user = userResult.rows[0];
    console.log(`   用户ID: ${user.id} (类型: ${typeof user.id})`);
    console.log(`   启用状态: ${user.enabled}`);
    
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log(`   密码匹配: ${passwordMatch}`);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: '密码错误' });
    }
    
    // 获取权限
    const permResult = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [user.id]);
    console.log(`   权限记录: ${permResult.rows.length > 0 ? '找到' : '未找到'}`);
    
    if (permResult.rows.length === 0) {
      return res.status(500).json({ error: '权限记录不存在 - 这就是500错误的原因！' });
    }
    
    const permissions = permResult.rows[0];
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('   ✅ 登录成功！');
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        enabled: Boolean(user.enabled),
        permissions: {
          file_upload: Boolean(permissions.file_upload),
          search: Boolean(permissions.search),
          download: Boolean(permissions.download),
          admin_panel: Boolean(permissions.admin_panel),
          data_delete: Boolean(permissions.data_delete)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 测试登录错误:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  🚑 紧急修复服务器已启动                      ║');
  console.log(`║  端口: ${PORT}                                      ║`);
  console.log('║                                                ║');
  console.log('║  可用端点:                                       ║');
  console.log('║  GET  /api/emergency-fix  - 执行紧急修复         ║');
  console.log('║  POST /api/test-login     - 测试登录             ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
});