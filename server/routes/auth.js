const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// 生成JWT令牌
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
}

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // 检查用户名是否已存在
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 哈希密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const userId = Date.now().toString();
    await pool.query(
      'INSERT INTO users (id, username, password, role, enabled) VALUES ($1, $2, $3, $4, $5)',
      [userId, username, hashedPassword, role || 'member', 1]
    );

    // 创建权限
    const isAdmin = (role || 'member') === 'admin';
    await pool.query(
      'INSERT INTO permissions (id, user_id, file_upload, search, download, admin_panel, data_delete) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [Date.now().toString(), userId, 1, 1, 1, isAdmin ? 1 : 0, isAdmin ? 1 : 0]
    );

    // 获取创建的用户
    const userResult = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = userResult.rows[0];

    // 获取权限
    const permissionResult = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [userId]);
    const permissions = permissionResult.rows[0];

    // 生成令牌
    const token = generateToken(user);

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        enabled: Boolean(user.enabled),
        permissions: {
          ...permissions,
          file_upload: Boolean(permissions.file_upload),
          search: Boolean(permissions.search),
          download: Boolean(permissions.download),
          admin_panel: Boolean(permissions.admin_panel),
          data_delete: Boolean(permissions.data_delete)
        }
      } 
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const user = userResult.rows[0];

    // 检查用户是否启用
    if (!user.enabled) {
      return res.status(401).json({ error: '账号已被禁用，请联系管理员' });
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 获取权限
    const permissionResult = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [user.id]);
    const permissions = permissionResult.rows[0] || {};

    // 生成令牌
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        enabled: Boolean(user.enabled),
        permissions: {
          ...permissions,
          file_upload: Boolean(permissions.file_upload),
          search: Boolean(permissions.search),
          download: Boolean(permissions.download),
          admin_panel: Boolean(permissions.admin_panel),
          data_delete: Boolean(permissions.data_delete)
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误，请稍后重试' });
  }
});

module.exports = router;