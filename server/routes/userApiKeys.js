const express = require('express');
const pool = require('../db');

const router = express.Router();

// 获取当前用户的所有API密钥
router.get('/', async (req, res) => {
  try {
    console.log('[DEBUG] GET /user-api-keys - req.user:', req.user);
    const userId = req.user.id; // 从JWT token中获取用户ID
    console.log('[DEBUG] GET /user-api-keys - userId:', userId);

    const result = await pool.query(
      'SELECT provider, api_key, base_url, model, created_at, updated_at FROM user_api_keys WHERE user_id = $1',
      [userId]
    );
    console.log('[DEBUG] GET /user-api-keys - query result:', result.rows);
    
    // 转换为对象格式，方便前端使用
    const apiKeys = {};
    result.rows.forEach(row => {
      apiKeys[row.provider] = {
        apiKey: row.api_key,
        baseUrl: row.base_url,
        model: row.model,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
    
    res.json(apiKeys);
  } catch (error) {
    console.error('Get user API keys error:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get API keys', details: error.message });
  }
});

// 获取指定provider的API密钥
router.get('/:provider', async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider } = req.params;
    
    const result = await pool.query(
      'SELECT api_key, base_url, model FROM user_api_keys WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json({
      apiKey: result.rows[0].api_key,
      baseUrl: result.rows[0].base_url,
      model: result.rows[0].model
    });
  } catch (error) {
    console.error('Get user API key error:', error);
    res.status(500).json({ error: 'Failed to get API key' });
  }
});

// 保存或更新API密钥
router.post('/:provider', async (req, res) => {
  try {
    console.log('[DEBUG] POST /user-api-keys/:provider - req.user:', req.user);
    const userId = req.user.id;
    const { provider } = req.params;
    const { apiKey, baseUrl, model } = req.body;
    console.log('[DEBUG] POST /user-api-keys/:provider - userId:', userId, 'provider:', provider);

    if (!apiKey) {
      return res.status(400).json({ error: 'API Key is required' });
    }

    // 先检查记录是否存在（兼容SQLite和PostgreSQL）
    const existingResult = await pool.query(
      'SELECT id FROM user_api_keys WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );

    if (existingResult.rows.length > 0) {
      // 记录存在，执行更新
      await pool.query(
        `UPDATE user_api_keys 
         SET api_key = $1, base_url = $2, model = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $4 AND provider = $5`,
        [apiKey, baseUrl || '', model || '', userId, provider]
      );
    } else {
      // 记录不存在，执行插入
      const id = Date.now().toString();
      await pool.query(
        `INSERT INTO user_api_keys (id, user_id, provider, api_key, base_url, model, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [id, userId, provider, apiKey, baseUrl || '', model || '']
      );
    }

    res.json({
      message: 'API key saved successfully',
      provider,
      apiKey,
      baseUrl: baseUrl || '',
      model: model || ''
    });
  } catch (error) {
    console.error('Save user API key error:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to save API key', details: error.message });
  }
});

// 删除API密钥
router.delete('/:provider', async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider } = req.params;
    
    await pool.query(
      'DELETE FROM user_api_keys WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    
    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete user API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
