const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 一键修复端点 - 访问这个 URL 即可修复所有问题
app.get('/fix', async (req, res) => {
  const results = [];
  
  try {
    // 1. 确保 admin 用户存在
    results.push({ step: 1, action: '检查 admin 用户', status: 'checking' });
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    let adminId;
    if (userCheck.rows.length === 0) {
      // 创建用户
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password', 10);
      adminId = 'admin-' + Date.now();
      await pool.query(
        'INSERT INTO users (id, username, password, role, enabled) VALUES ($1, $2, $3, $4, $5)',
        [adminId, 'admin', hashedPassword, 'admin', 1]
      );
      results.push({ step: 1, action: '创建 admin 用户', status: 'created', id: adminId });
    } else {
      adminId = userCheck.rows[0].id;
      results.push({ step: 1, action: 'admin 用户已存在', status: 'exists', id: adminId });
    }

    // 2. 确保权限记录存在
    results.push({ step: 2, action: '检查 permissions 表', status: 'checking' });
    const permCheck = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [adminId]);
    
    if (permCheck.rows.length === 0) {
      // 创建权限
      await pool.query(
        'INSERT INTO permissions (id, user_id, file_upload, search, download, admin_panel, data_delete) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['perm-' + adminId, adminId, 1, 1, 1, 1, 1]
      );
      results.push({ step: 2, action: '创建 permissions 记录', status: 'created' });
    } else {
      // 更新权限
      await pool.query(
        'UPDATE permissions SET file_upload = 1, search = 1, download = 1, admin_panel = 1, data_delete = 1 WHERE user_id = $1',
        [adminId]
      );
      results.push({ step: 2, action: '更新 permissions 记录', status: 'updated' });
    }

    // 3. 确保 persons 表结构正确
    results.push({ step: 3, action: '检查 persons 表结构', status: 'checking' });
    try {
      await pool.query(`ALTER TABLE persons ALTER COLUMN id TYPE TEXT USING id::TEXT`);
      results.push({ step: 3, action: 'persons.id 已转换为 TEXT', status: 'fixed' });
    } catch (e) {
      results.push({ step: 3, action: 'persons.id 转换', status: 'skipped', reason: e.message });
    }

    // 4. 确保 certificates 表结构正确
    results.push({ step: 4, action: '检查 certificates 表结构', status: 'checking' });
    try {
      await pool.query(`ALTER TABLE certificates ALTER COLUMN id TYPE TEXT USING id::TEXT`);
      await pool.query(`ALTER TABLE certificates ALTER COLUMN person_id TYPE TEXT USING person_id::TEXT`);
      results.push({ step: 4, action: 'certificates 表已转换', status: 'fixed' });
    } catch (e) {
      results.push({ step: 4, action: 'certificates 转换', status: 'skipped', reason: e.message });
    }

    // 5. 验证修复
    results.push({ step: 5, action: '验证修复结果', status: 'checking' });
    const finalUser = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    const finalPerm = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [adminId]);
    
    results.push({
      step: 5,
      action: '验证完成',
      status: finalUser.rows.length > 0 && finalPerm.rows.length > 0 ? 'success' : 'failed',
      user: finalUser.rows.length > 0 ? 'OK' : 'MISSING',
      permissions: finalPerm.rows.length > 0 ? 'OK' : 'MISSING'
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>🎉 修复完成</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f0f0f0; }
    .card { background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #28a745; margin-bottom: 30px; }
    .step { padding: 15px; margin: 10px 0; border-radius: 5px; background: #f8f9fa; }
    .step.success { background: #d4edda; border-left: 4px solid #28a745; }
    .step.checking { background: #fff3cd; border-left: 4px solid #ffc107; }
    .step.failed { background: #f8d7da; border-left: 4px solid #dc3545; }
    .btn { display: inline-block; padding: 15px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 5px; }
    .btn:hover { background: #0056b3; }
    code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎉 数据库修复完成！</h1>
    ${results.map(r => `<div class="step ${r.status === 'success' || r.status === 'exists' || r.status === 'created' || r.status === 'updated' || r.status === 'fixed' ? 'success' : r.status === 'checking' ? 'checking' : 'failed'}">
      <strong>步骤 ${r.step}:</strong> ${r.action}<br>
      <small>状态: ${r.status} ${r.id ? `(ID: ${r.id})` : ''} ${r.reason ? `(${r.reason})` : ''}</small>
    </div>`).join('')}
    <div style="margin-top: 30px; text-align: center;">
      <a href="/" class="btn">🌐 访问主页</a>
      <a href="/login" class="btn">🔐 测试登录</a>
    </div>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      📝 登录凭证: <code>admin</code> / <code>password</code><br>
      🌐 前端地址: <code>https://cjdxsw126.github.io/renyuan/</code>
    </p>
  </div>
</body>
</html>`;

    res.type('html').send(html);

  } catch (error) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>❌ 修复失败</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f0f0f0; }
    .card { background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #dc3545; }
    pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .btn { display: inline-block; padding: 15px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 5px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>❌ 修复失败</h1>
    <p>错误信息:</p>
    <pre>${error.message}</pre>
    <p>请查看 Render Dashboard 的日志获取更多信息。</p>
    <a href="/fix" class="btn">🔄 重试修复</a>
  </div>
</body>
</html>`;
    res.type('html').send(html);
  }
});

// 测试登录端点
app.post('/api/test-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');

    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: '密码错误' });
    }

    const permResult = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [user.id]);
    if (permResult.rows.length === 0) {
      return res.status(500).json({ error: '权限记录不存在' });
    }

    const permissions = permResult.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, permissions } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 主页
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '🚀 Render 后端修复服务运行中',
    fix_url: 'https://xuanren-1.onrender.com/fix',
    login_url: 'https://cjdxsw126.github.io/renyuan/',
    credentials: { username: 'admin', password: 'password' }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 修复服务器运行中: http://localhost:${PORT}`);
  console.log(`   修复端点: http://localhost:${PORT}/fix`);
  console.log(`\n🎯 访问 https://xuanren-1.onrender.com/fix 进行一键修复！\n`);
});