const express = require('express');
const pool = require('../db');

const router = express.Router();

// 获取数据集中的所有人员
router.get('/dataset/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;
    const personsResult = await pool.query('SELECT * FROM persons WHERE dataset_id = ?', [datasetId]);
    
    // 获取每个人员的证书
    const personsWithCertificates = await Promise.all(
      personsResult.rows.map(async (person) => {
        const certificatesResult = await pool.query('SELECT * FROM certificates WHERE person_id = ?', [person.id]);
        // 解析原始数据
        if (person.original_data) {
          try {
            person.original_data = JSON.parse(person.original_data);
          } catch (e) {
            console.error('Error parsing original_data:', e);
          }
        }
        return { ...person, certificates: certificatesResult.rows };
      })
    );

    res.json(personsWithCertificates);
  } catch (error) {
    console.error('Get persons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 根据ID获取人员
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const personResult = await pool.query('SELECT * FROM persons WHERE id = ?', [id]);

    if (personResult.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const person = personResult.rows[0];
    // 解析原始数据
    if (person.original_data) {
      try {
        person.original_data = JSON.parse(person.original_data);
      } catch (e) {
        console.error('Error parsing original_data:', e);
      }
    }
    const certificatesResult = await pool.query('SELECT * FROM certificates WHERE person_id = ?', [person.id]);

    res.json({ ...person, certificates: certificatesResult.rows });
  } catch (error) {
    console.error('Get person error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建人员
router.post('/', async (req, res) => {
  try {
    const { dataset_id, name, age, education, major, employee_id, original_data, certificates } = req.body;

    // 开始事务
    const client = await pool.connect();
    try {
      // 创建人员
      const originalDataStr = original_data ? JSON.stringify(original_data) : null;
      const result = await client.run(
        'INSERT INTO persons (dataset_id, name, age, education, major, employee_id, original_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [dataset_id, name, age, education, major || null, employee_id, originalDataStr]
      );

      const personId = result.lastID;

      // 创建证书
      const createdCertificates = [];
      if (certificates && certificates.length > 0) {
        for (const cert of certificates) {
          const certResult = await client.run(
            'INSERT INTO certificates (person_id, name, value) VALUES (?, ?, ?)',
            [personId, cert.name, cert.value]
          );
          createdCertificates.push({ id: certResult.lastID, person_id: personId, name: cert.name, value: cert.value });
        }
      }

      // 获取完整的人员信息
      const personResult = await pool.query('SELECT * FROM persons WHERE id = ?', [personId]);
      const person = personResult.rows[0];
      // 解析原始数据
      if (person.original_data) {
        try {
          person.original_data = JSON.parse(person.original_data);
        } catch (e) {
          console.error('Error parsing original_data:', e);
        }
      }

      res.json({ ...person, certificates: createdCertificates });
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 批量创建人员
router.post('/batch', async (req, res) => {
  try {
    const { dataset_id, persons } = req.body;

    // 开始事务
    const client = await pool.connect();
    try {
      const createdPersons = [];

      for (const personData of persons) {
        const { name, age, education, major, employee_id, original_data, certificates } = personData;

        // 创建人员
        const originalDataStr = original_data ? JSON.stringify(original_data) : null;
        const result = await client.run(
          'INSERT INTO persons (dataset_id, name, age, education, major, employee_id, original_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [dataset_id, name, age, education, major || null, employee_id, originalDataStr]
        );

        const personId = result.lastID;

        // 创建证书
        const createdCertificates = [];
        if (certificates && certificates.length > 0) {
          for (const cert of certificates) {
            const certResult = await client.run(
              'INSERT INTO certificates (person_id, name, value) VALUES (?, ?, ?)',
              [personId, cert.name, cert.value]
            );
            createdCertificates.push({ id: certResult.lastID, person_id: personId, name: cert.name, value: cert.value });
          }
        }

        // 获取完整的人员信息
        const personResult = await client.query('SELECT * FROM persons WHERE id = ?', [personId]);
        const person = personResult.rows[0];
        // 解析原始数据
        if (person.original_data) {
          try {
            person.original_data = JSON.parse(person.original_data);
          } catch (e) {
            console.error('Error parsing original_data:', e);
          }
        }
        createdPersons.push({ ...person, certificates: createdCertificates });
      }

      // 更新数据集的计数
      await client.run('UPDATE datasets SET count = count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [persons.length, dataset_id]);

      res.json(createdPersons);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Batch create persons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新人员
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, education, employee_id, original_data, certificates } = req.body;

    // 开始事务
    const client = await pool.connect();
    try {
      // 检查人员是否存在
      const existingPerson = await client.query('SELECT * FROM persons WHERE id = ?', [id]);
      if (existingPerson.rows.length === 0) {
        return res.status(404).json({ error: 'Person not found' });
      }

      // 构建更新语句
      const updates = [];
      const params = [];

      if (name) {
        updates.push(`name = ?`);
        params.push(name);
      }

      if (age !== undefined) {
        updates.push(`age = ?`);
        params.push(age);
      }

      if (education) {
        updates.push(`education = ?`);
        params.push(education);
      }

      if (major !== undefined) {
        updates.push(`major = ?`);
        params.push(major);
      }

      if (employee_id) {
        updates.push(`employee_id = ?`);
        params.push(employee_id);
      }

      if (original_data) {
        updates.push(`original_data = ?`);
        params.push(JSON.stringify(original_data));
      }

      if (updates.length > 0) {
        const updateQuery = `UPDATE persons SET ${updates.join(', ')} WHERE id = ?`;
        params.push(id);
        await client.run(updateQuery, params);
      }

      // 更新证书
      if (certificates !== undefined) {
        // 删除现有证书
        await client.run('DELETE FROM certificates WHERE person_id = ?', [id]);

        // 添加新证书
        if (certificates.length > 0) {
          for (const cert of certificates) {
            await client.run(
              'INSERT INTO certificates (person_id, name, value) VALUES (?, ?, ?)',
              [id, cert.name, cert.value]
            );
          }
        }
      }

      // 获取更新后的人员信息
      const updatedPersonResult = await client.query('SELECT * FROM persons WHERE id = ?', [id]);
      const updatedPerson = updatedPersonResult.rows[0];
      // 解析原始数据
      if (updatedPerson.original_data) {
        try {
          updatedPerson.original_data = JSON.parse(updatedPerson.original_data);
        } catch (e) {
          console.error('Error parsing original_data:', e);
        }
      }
      const certificatesResult = await client.query('SELECT * FROM certificates WHERE person_id = ?', [id]);

      res.json({ ...updatedPerson, certificates: certificatesResult.rows });
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除人员
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查人员是否存在
    const existingPerson = await pool.query('SELECT * FROM persons WHERE id = ?', [id]);
    if (existingPerson.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const person = existingPerson.rows[0];

    // 开始事务
    const client = await pool.connect();
    try {
      // 删除人员（级联删除证书）
      await client.run('DELETE FROM persons WHERE id = ?', [id]);

      // 更新数据集的计数
      await client.run('UPDATE datasets SET count = count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [person.dataset_id]);

      res.json({ message: 'Person deleted successfully' });
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete person error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 批量删除人员
router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: 'No ids provided' });
    }

    // 开始事务
    const client = await pool.connect();
    try {
      // 获取要删除的人员所属的数据集
      const datasetIds = new Set();
      for (const id of ids) {
        const personResult = await client.query('SELECT dataset_id FROM persons WHERE id = ?', [id]);
        if (personResult.rows.length > 0) {
          datasetIds.add(personResult.rows[0].dataset_id);
        }
      }

      // 删除人员（级联删除证书）
      for (const id of ids) {
        await client.run('DELETE FROM persons WHERE id = ?', [id]);
      }

      // 更新每个数据集的计数
      for (const datasetId of datasetIds) {
        const countResult = await client.query('SELECT COUNT(*) as count FROM persons WHERE dataset_id = ?', [datasetId]);
        const newCount = countResult.rows[0].count;
        await client.run('UPDATE datasets SET count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newCount, datasetId]);
      }

      res.json({ message: `Successfully deleted ${ids.length} persons` });
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Batch delete persons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;