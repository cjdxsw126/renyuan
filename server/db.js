const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 创建数据库连接
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// 启用外键约束
db.run('PRAGMA foreign_keys = ON');

// 封装查询方法
const pool = {
  // 执行查询并返回所有结果
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve({ rows });
        }
      });
    });
  },
  
  // 执行查询并返回单个结果
  queryOne: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },
  
  // 执行非查询语句（如INSERT, UPDATE, DELETE）
  run: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
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
        if (err) {
          console.error('Error closing database:', err);
        }
        resolve();
      });
    });
  }
};

module.exports = pool;