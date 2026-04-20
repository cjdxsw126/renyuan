const { Pool } = require('pg');
const path = require('path');

// 数据库配置 - 支持环境变量
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

let pool;

if (databaseUrl) {
  // PostgreSQL 配置（用于云部署）
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  // 监听连接错误
  pool.on('error', (err) => {
    console.error('❌ PostgreSQL 连接池错误:', err.message);
  });

} else if (isProduction) {
  // 生产环境 - 使用 SQLite + Render 持久化磁盘
  const sqlite3 = require('sqlite3').verbose();
  
  // Render 持久化磁盘路径或默认路径
  const dataDir = process.env.RENDER_PERSISTENT_DIR || path.join(__dirname, 'data');
  const fs = require('fs');
  
  // 确保数据目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dbPath = path.join(dataDir, 'database.db');
  console.log(`📦 生产环境使用 SQLite 数据库: ${dbPath}`);
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ SQLite 数据库连接错误:', err);
    } else {
      console.log('✅ 已连接到 SQLite 数据库 (生产模式)');
    }
  });
  
} else {
  // SQLite 配置（用于本地开发）
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'database.db');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ SQLite 数据库连接错误:', err);
    } else {
      console.log('✅ 已连接到 SQLite 数据库 (本地开发模式)');
    }
  });

  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON');

  // 封装 SQLite 为兼容 PostgreSQL 的接口
  pool = {
    query: async (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        });
      });
    },
    
    queryOne: async (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },
    
    run: async (sql, params = []) => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },
    
    connect: () => {
      return Promise.resolve({ 
        query: pool.query, 
        queryOne: pool.queryOne,
        run: pool.run,
        release: () => {} 
      });
    },
    
    end: () => {
      return new Promise((resolve) => {
        db.close((err) => {
          if (err) console.error('关闭数据库时出错:', err);
          resolve();
        });
      });
    }
  };
}

module.exports = pool;