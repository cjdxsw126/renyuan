const { Pool } = require('pg');
const path = require('path');

// 数据库配置 - 支持环境变量
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = process.env.DATABASE_URL || isProduction;

let pool;

if (usePostgres) {
  // PostgreSQL 配置（用于云部署）
  const databaseUrl = process.env.DATABASE_URL;
  
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false } // Render/Heroku 需要
  });

  console.log('✅ Connected to PostgreSQL database');
} else {
  // SQLite 配置（用于本地开发）
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'database.db');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Database connection error:', err);
    } else {
      console.log('✅ Connected to SQLite database');
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
          if (err) console.error('Error closing database:', err);
          resolve();
        });
      });
    }
  };
}

module.exports = pool;