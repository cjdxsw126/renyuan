const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 创建数据库连接
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  db.serialize(() => {
    // 启用外键约束
    db.run('PRAGMA foreign_keys = ON');

    // 创建用户表
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_password_change DATETIME
      )
    `);

    // 创建权限表
    db.run(`
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        file_upload INTEGER NOT NULL DEFAULT 1,
        search INTEGER NOT NULL DEFAULT 1,
        download INTEGER NOT NULL DEFAULT 1,
        admin_panel INTEGER NOT NULL DEFAULT 0,
        data_delete INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 创建数据集表
    db.run(`
      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
      )
    `);

    // 创建人员表
    db.run(`
      CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER,
        education TEXT,
        major TEXT,
        employee_id TEXT,
        original_data TEXT,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
      )
    `);

    // 创建证书表
    db.run(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        value TEXT,
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables created successfully');
  });

  db.close();
}

initDatabase();