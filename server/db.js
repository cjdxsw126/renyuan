const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// 数据库配置 - 支持环境变量
const isProduction = process.env.NODE_ENV === 'production';
const isElectron = process.env.ELECTRON_MODE === 'true';
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

} else {
  // SQLite 配置（用于本地开发和 Electron）
  const sqlite3 = require('sqlite3').verbose();
  
  let dbPath;
  
  if (isElectron) {
    // Electron 环境：使用应用数据目录
    const userDataPath = process.env.ELECTRON_USER_DATA_PATH || path.join(process.env.USERPROFILE || process.env.HOME, '.renyuan-desktop');
    
    // 确保数据目录存在
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    dbPath = path.join(userDataPath, 'database.db');
    console.log(`📦 Electron 模式使用 SQLite 数据库: ${dbPath}`);
  } else if (isProduction) {
    // 生产环境 - 使用 SQLite + Render 持久化磁盘
    const dataDir = process.env.RENDER_PERSISTENT_DIR || path.join(__dirname, 'data');
    
    // 确保数据目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    dbPath = path.join(dataDir, 'database.db');
    console.log(`📦 生产环境使用 SQLite 数据库: ${dbPath}`);
  } else {
    // 本地开发模式
    dbPath = path.join(__dirname, 'database.db');
    console.log(`📦 本地开发模式使用 SQLite 数据库: ${dbPath}`);
  }
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ SQLite 数据库连接错误:', err);
    } else {
      console.log('✅ 已连接到 SQLite 数据库');
    }
  });

  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON');

  // 封装 SQLite 为兼容 PostgreSQL 的接口
  pool = {
    query: async (sql, params = []) => {
      return new Promise((resolve, reject) => {
        // 转换 PostgreSQL 的 $1, $2 为 SQLite 的 ?
        const sqliteSql = sql.replace(/\$(\d+)/g, '?');
        db.all(sqliteSql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        });
      });
    },
    
    queryOne: async (sql, params = []) => {
      return new Promise((resolve, reject) => {
        const sqliteSql = sql.replace(/\$(\d+)/g, '?');
        db.get(sqliteSql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },
    
    run: async (sql, params = []) => {
      return new Promise((resolve, reject) => {
        const sqliteSql = sql.replace(/\$(\d+)/g, '?');
        db.run(sqliteSql, params, function(err) {
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
