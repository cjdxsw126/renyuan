const { Pool } = require('pg');

// 从环境变量获取数据库 URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL 环境变量未设置');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  try {
    console.log('🚀 开始初始化 PostgreSQL 数据库...\n');

    // 创建用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_password_change TIMESTAMP
      )
    `);
    console.log('✅ 用户表 (users) 创建成功');

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
    console.log('✅ 权限表 (permissions) 创建成功');

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
    console.log('✅ 数据集表 (datasets) 创建成功');

    // 创建人员表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS persons (
        id SERIAL PRIMARY KEY,
        dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        age INTEGER,
        education TEXT,
        major TEXT,
        employee_id TEXT,
        original_data TEXT
      )
    `);
    console.log('✅ 人员表 (persons) 创建成功');

    // 创建证书表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        value TEXT
      )
    `);
    console.log('✅ 证书表 (certificates) 创建成功');

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
      
      console.log('\n🎉 默认管理员账户创建成功！');
      console.log('   用户名: admin');
      console.log('   密码: password');
    }

    console.log('\n✅ 数据库初始化完成！\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();