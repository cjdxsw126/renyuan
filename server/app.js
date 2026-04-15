const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 注册路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const datasetRoutes = require('./routes/datasets');
const personRoutes = require('./routes/persons');
const aiRoutes = require('./routes/ai');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/ai', aiRoutes);

const PORT = process.env.PORT || 3001;

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        permission_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, permission_type)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        count INTEGER DEFAULT 0,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS persons (
        id SERIAL PRIMARY KEY,
        dataset_id TEXT REFERENCES datasets(id),
        name VARCHAR(255),
        age INTEGER,
        education VARCHAR(100),
        major VARCHAR(255),
        employee_id VARCHAR(255),
        original_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        person_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        value VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const adminCheck = await pool.query("SELECT * FROM users WHERE username = $1", ['admin']);
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO users (username, password, role, enabled) VALUES ($1, $2, $3, $4)",
        ['admin', hashedPassword, 'admin', true]
      );
      const adminResult = await pool.query("SELECT id FROM users WHERE username = $1", ['admin']);
      const adminId = adminResult.rows[0].id;
      await pool.query(
        "INSERT INTO permissions (user_id, permission_type) VALUES ($1, $2), ($1, $3), ($1, $4), ($1, $5)",
        [adminId, 'import_data', 'view_data', 'export_data', 'manage_users']
      );
      console.log('✅ 默认管理员账户已创建: admin / admin123');
    }

    const permCheck = await pool.query("SELECT * FROM permissions WHERE user_id = (SELECT id FROM users WHERE username = $1)", ['admin']);
    if (permCheck.rows.length === 0) {
      const adminResult2 = await pool.query("SELECT id FROM users WHERE username = $1", ['admin']);
      if (adminResult2.rows.length > 0) {
        const aid = adminResult2.rows[0].id;
        await pool.query("INSERT INTO permissions (user_id, permission_type) VALUES ($1,$2),($1,$3),($1,$4),($1,$5)",
          [aid,'import_data','view_data','export_data','manage_users']);
        console.log('✅ 管理员权限已修复');
      }
    }
    
    console.log('✅ 数据库初始化完成');
  } catch (err) {
    console.error('❌ 数据库初始化错误:', err.message);
  }
}

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}\n`);
    console.log(`   API: http://localhost:${PORT}/api\n`);
  });
}).catch(err => {
  console.error('❌ 启动失败:', err.message);
});