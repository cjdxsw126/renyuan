const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

// 获取所有用户
router.get('/', async (req, res) => {
  try {
    const usersResult = await pool.query('SELECT * FROM users');
    const users = usersResult.rows;

    // 获取每个用户的权限
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const permissionResult = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [user.id]);
        const permissions = permissionResult.rows[0];
        return { 
          ...user, 
          enabled: Boolean(user.enabled),
          permissions: {
            ...permissions,
            file_upload: Boolean(permissions?.file_upload),
            search: Boolean(permissions?.search),
            download: Boolean(permissions?.download),
            admin_panel: Boolean(permissions?.admin_panel),
            data_delete: Boolean(permissions?.data_delete)
          }
        };
      })
    );

    res.json(usersWithPermissions);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 根据ID获取用户
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const permissionResult = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [user.id]);
    const permissions = permissionResult.rows[0];

    res.json({ 
      ...user, 
      enabled: Boolean(user.enabled),
      permissions: {
        ...permissions,
        file_upload: Boolean(permissions?.file_upload),
        search: Boolean(permissions?.search),
        download: Boolean(permissions?.download),
        admin_panel: Boolean(permissions?.admin_panel),
        data_delete: Boolean(permissions?.data_delete)
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建用户
router.post('/', async (req, res) => {
  try {
    const { username, password, role, enabled } = req.body;

    // 检查用户名是否已存在
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // 哈希密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const userId = Date.now().toString();
    await pool.query(
      'INSERT INTO users (id, username, password, role, enabled) VALUES ($1, $2, $3, $4, $5)',
      [userId, username, hashedPassword, role || 'member', enabled !== false ? 1 : 0]
    );

    // 创建权限
    const isAdmin = (role || 'member') === 'admin';
    await pool.query(
      'INSERT INTO permissions (id, user_id, file_upload, search, download, admin_panel, data_delete) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [Date.now().toString(), userId, 1, 1, 1, isAdmin ? 1 : 0, isAdmin ? 1 : 0]
    );

    // 获取创建的用户
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    res.json({ ...user, enabled: Boolean(user.enabled) });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新用户
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, enabled } = req.body;

    // 检查用户是否存在
    const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 检查用户名是否已被其他用户使用
    if (username) {
      const usernameCheck = await pool.query('SELECT * FROM users WHERE username = $1 AND id != $2', [username, id]);
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    // 构建更新语句
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (username) {
      updates.push(`username = $${paramIndex}`);
      params.push(username);
      paramIndex++;
    }

    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updates.push(`password = $${paramIndex}, last_password_change = CURRENT_TIMESTAMP`);
      params.push(hashedPassword);
      paramIndex++;
    }

    if (role) {
      updates.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex}`);
      params.push(enabled ? 1 : 0);
      paramIndex++;
    }

    if (updates.length > 0) {
      const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
      params.push(id);
      await pool.query(updateQuery, params);

      // 如果角色改变，更新权限
      if (role) {
        await pool.query(
          'UPDATE permissions SET admin_panel = $1, data_delete = $2 WHERE user_id = $3',
          [(role === 'admin') ? 1 : 0, (role === 'admin') ? 1 : 0, id]
        );
      }
    }

    // 获取更新后的用户
    const updatedUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const updatedUser = updatedUserResult.rows[0];
    const permissionResult = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [id]);
    const permissions = permissionResult.rows[0];

    res.json({ 
      ...updatedUser, 
      enabled: Boolean(updatedUser.enabled),
      permissions: {
        ...permissions,
        file_upload: Boolean(permissions?.file_upload),
        search: Boolean(permissions?.search),
        download: Boolean(permissions?.download),
        admin_panel: Boolean(permissions?.admin_panel),
        data_delete: Boolean(permissions?.data_delete)
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新用户权限
router.put('/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const { file_upload, search, download, admin_panel, data_delete } = req.body;

    // 检查用户是否存在
    const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 更新权限
    await pool.query(
      'UPDATE permissions SET file_upload = $1, search = $2, download = $3, admin_panel = $4, data_delete = $5 WHERE user_id = $6',
      [file_upload ? 1 : 0, search ? 1 : 0, download ? 1 : 0, admin_panel ? 1 : 0, data_delete ? 1 : 0, id]
    );

    // 获取更新后的权限
    const permissionResult = await pool.query('SELECT * FROM permissions WHERE user_id = $1', [id]);
    const permissions = permissionResult.rows[0];

    res.json({
      ...permissions,
      file_upload: Boolean(permissions?.file_upload),
      search: Boolean(permissions?.search),
      download: Boolean(permissions?.download),
      admin_panel: Boolean(permissions?.admin_panel),
      data_delete: Boolean(permissions?.data_delete)
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除用户
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查用户是否存在
    const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 删除用户（级联删除权限）
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;