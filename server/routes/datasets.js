const express = require('express');
const pool = require('../db');

const router = express.Router();

// 获取所有数据集
router.get('/', async (req, res) => {
  try {
    const datasetsResult = await pool.query('SELECT * FROM datasets ORDER BY created_at DESC');
    res.json(datasetsResult.rows);
  } catch (error) {
    console.error('Get datasets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 根据ID获取数据集
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const datasetResult = await pool.query('SELECT * FROM datasets WHERE id = $1', [id]);

    if (datasetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.json(datasetResult.rows[0]);
  } catch (error) {
    console.error('Get dataset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建数据集
router.post('/', async (req, res) => {
  try {
    const { name, count, certificate_options } = req.body;
    
    console.log('[DEBUG] 创建数据集请求:', { name, count, certificate_options });

    if (!name) {
      return res.status(400).json({ error: 'Dataset name is required' });
    }

    const datasetId = Date.now().toString();
    await pool.query(
      'INSERT INTO datasets (id, name, count) VALUES ($1, $2, $3)',
      [datasetId, name, count || 0]
    );

    // 获取创建的数据集
    const datasetResult = await pool.query('SELECT * FROM datasets WHERE id = $1', [datasetId]);
    const dataset = datasetResult.rows[0];
    
    // 添加证书选项到返回结果
    if (certificate_options) {
      dataset.certificate_options = certificate_options;
    }
    
    console.log('[DEBUG] 数据集创建成功:', dataset);
    res.json(dataset);
  } catch (error) {
    console.error('Create dataset error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// 更新数据集
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, count } = req.body;

    // 检查数据集是否存在
    const existingDataset = await pool.query('SELECT * FROM datasets WHERE id = $1', [id]);
    if (existingDataset.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // 构建更新语句
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (count !== undefined) {
      updates.push(`count = $${paramIndex}`);
      params.push(count);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    const updateQuery = `UPDATE datasets SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    params.push(id);
    await pool.query(updateQuery, params);

    // 获取更新后的数据集
    const updatedDatasetResult = await pool.query('SELECT * FROM datasets WHERE id = $1', [id]);
    res.json(updatedDatasetResult.rows[0]);
  } catch (error) {
    console.error('Update dataset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除数据集
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查数据集是否存在
    const existingDataset = await pool.query('SELECT * FROM datasets WHERE id = $1', [id]);
    if (existingDataset.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // 删除数据集（级联删除关联的人员和证书）
    await pool.query('DELETE FROM datasets WHERE id = $1', [id]);

    res.json({ message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Delete dataset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;