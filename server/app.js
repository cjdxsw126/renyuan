const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./db');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const datasetRoutes = require('./routes/datasets');
const personRoutes = require('./routes/persons');
const aiRoutes = require('./routes/ai');
const userApiKeyRoutes = require('./routes/userApiKeys');

// JWT认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user-api-keys', authenticateToken, userApiKeyRoutes);



// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 自动初始化数据库表结构
async function initDatabase() {
  try {
    console.log('🚀 初始化数据库表结构...\n');

    // 创建用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_password_change TIMESTAMP,
        avatar TEXT
      )
    `);
    console.log('✅ 用户表 (users) 就绪');
    
    // 检查并添加 avatar 列（兼容已有表）
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN avatar TEXT`);
      console.log('✅ 已添加 avatar 列到用户表');
    } catch (e) {
      // 列已存在，忽略错误
    }

    // 创建权限表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_upload INTEGER NOT NULL DEFAULT 1,
        search INTEGER NOT NULL DEFAULT 1,
        download INTEGER NOT NULL DEFAULT 1,
        admin_panel INTEGER NOT NULL DEFAULT 0,
        data_delete INTEGER NOT NULL DEFAULT 0
      )
    `);
    console.log('✅ 权限表 (permissions) 就绪');

    // 创建数据集表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);
    console.log('✅ 数据集表 (datasets) 就绪');

    // ========== 彻底重建人员表和证书表（如果类型不对） ==========
    if (process.env.DATABASE_URL) {
      try {
        const colResult = await pool.query(`
          SELECT column_name, data_type FROM information_schema.columns
          WHERE table_name = 'persons' AND column_name IN ('id', 'dataset_id', 'person_id')
        `);
        
        const needsRebuild = colResult.rows.some(col => 
          ['id', 'dataset_id'].includes(col.column_name) && 
          ['integer', 'bigint', 'serial', 'int4'].includes(col.data_type)
        );

        if (needsRebuild) {
          console.log('\n⚠️  发现旧版表结构（INTEGER 类型ID），正在彻底重建...');
          
          try { await pool.query('DROP TABLE IF EXISTS certificates'); } catch(e) {}
          try { await pool.query('DROP TABLE IF EXISTS persons'); } catch(e) {}
          
          console.log('✅ 已删除旧表');
        }
      } catch(e) {
        console.log('📋 首次部署或 SQLite 模式，跳过检测');
      }
    }

    // 创建人员表（完整结构，包含所有字段）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        age INTEGER,
        education TEXT,
        major TEXT,
        employee_id TEXT,
        original_data TEXT,
        tenure REAL DEFAULT 0,
        graduation_tenure REAL DEFAULT 0,
        certificate_columns TEXT DEFAULT '{}'
      )
    `);
    console.log('✅ 人员表 (persons) 就绪 - 完整结构（TEXT ID）');

    // 创建证书表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        value TEXT
      )
    `);
    console.log('✅ 证书表 (certificates) 就绪 - TEXT 类型');
    
    // 修复已存在的证书表 - SQLite兼容
    try {
      const certTableInfo = await pool.query('PRAGMA table_info(certificates)');
      const certColumns = certTableInfo.rows.map(r => r.name);
      console.log(`✅ 证书表 (certificates) 就绪, 列: [${certColumns.join(', ')}]`);
    } catch (e) {
      console.log('✅ 证书表 (certificates) 就绪');
    }

    // 创建用户API密钥表（每个用户独立的API KEY）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        api_key TEXT NOT NULL,
        base_url TEXT,
        model TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider)
      )
    `);
    console.log('✅ 用户API密钥表 (user_api_keys) 就绪');

    // 检查并创建默认管理员用户
    const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);

    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('password', saltRounds);

      const adminId = Date.now().toString();
      await pool.query(
        'INSERT INTO users (id, username, password, role, enabled) VALUES ($1, $2, $3, $4, $5)',
        [adminId, 'admin', hashedPassword, 'admin', 1]
      );

      await pool.query(
        'INSERT INTO permissions (id, user_id, file_upload, search, download, admin_panel, data_delete) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [Date.now().toString(), adminId, 1, 1, 1, 1, 1]
      );

      console.log('\n🎉 默认管理员账户已创建！');
      console.log('   用户名: admin');
      console.log('   密码: password\n');
    } else {
        // ✅ 关键修复：确保已有用户的权限记录存在且正确
        const existingAdmin = adminCheck.rows[0];
        console.log(`\n✅ 管理员账户已存在 (ID: ${existingAdmin.id})`);

        // 检查权限记录
        const permCheck = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [existingAdmin.id]);

        if (permCheck.rows.length === 0) {
          // 权限记录缺失 - 创建它
          console.log('⚠️  发现问题：管理员缺少权限记录，正在修复...');

          await pool.query(
            `INSERT INTO permissions (id, user_id, file_upload, search, download, admin_panel, data_delete)
             VALUES ($1, $2, 1, 1, 1, 1, 1)`,
            ['perm-fix-' + Date.now(), existingAdmin.id]
          );

          console.log('✅ 权限记录已修复！');
        } else {
          console.log('✅ 权限记录已验证存在');
        }

        console.log('   用户名: admin');
        console.log('   密码: password\n');
    }

    console.log('✅ 数据库初始化完成！\n');
  } catch (error) {
    console.error('❌ 数据库初始化失败:');
    console.error('   错误详情:', error.message);
    console.error('   完整错误:', error.toString());
    if (error.stack) {
      console.error('   堆栈:', error.stack);
    }
    process.exit(1);
  }
}

// 启动服务器（先初始化数据库）
const PORT = process.env.PORT || 3001;

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('✅ 服务器启动成功！');
    console.log(`   端口: ${PORT}`);
    console.log('   数据库: 已连接并初始化');
    console.log('   环境: ' + (process.env.NODE_ENV || 'development'));
    console.log('=================================\n');
    
    // 输出可用路由
    console.log('📡 可用的 API 端点:');
    console.log('   GET  /api/health        - 健康检查');
    console.log('   POST /api/auth/login    - 用户登录');
    console.log('   GET  /api/users         - 获取用户列表');
    console.log('   GET  /api/datasets      - 获取数据集列表');
    console.log('   GET  /api/persons       - 获取人员数据\n');
  });
}).catch((err) => {
  console.error('\n❌❌❌ 启动失败 ❌❌❌');
  console.error('错误详情:', err.message);
  if (err.stack) {
    console.error('堆栈:', err.stack);
  }
  console.error('\n请检查:');
  console.error('1. DATABASE_URL 环境变量是否正确设置');
  console.error('2. PostgreSQL 数据库是否可访问');
  console.error('3. 网络连接是否正常\n');
  
  // 不要立即退出，让 Render 能看到日志
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

module.exports = app;