const express = require('express');
const pool = require('../db');

const router = express.Router();

// 获取数据集中的所有人员
router.get('/dataset/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;
    const personsResult = await pool.query('SELECT * FROM persons WHERE dataset_id = $1', [datasetId]);

    const personsWithCertificates = await Promise.all(
      personsResult.rows.map(async (person) => {
        const certificatesResult = await pool.query('SELECT * FROM certificates WHERE person_id = $1', [person.id]);
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
    res.status(500).json({ error: error.message });
  }
});

// 根据ID获取人员
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const personResult = await pool.query('SELECT * FROM persons WHERE id = $1', [id]);

    if (personResult.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const person = personResult.rows[0];
    if (person.original_data) {
      try {
        person.original_data = JSON.parse(person.original_data);
      } catch (e) {
        console.error('Error parsing original_data:', e);
      }
    }
    const certificatesResult = await pool.query('SELECT * FROM certificates WHERE person_id = $1', [id]);

    res.json({ ...person, certificates: certificatesResult.rows });
  } catch (error) {
    console.error('Get person error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 创建人员（简化版，无事务）
router.post('/', async (req, res) => {
  try {
    const { dataset_id, name, age, education, major, employee_id, original_data, certificates } = req.body;

    const originalDataStr = original_data ? JSON.stringify(original_data) : null;
    const personId = 'person-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    const result = await pool.query(
      'INSERT INTO persons (id, dataset_id, name, age, education, major, employee_id, original_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [personId, dataset_id, name, age, education, major || null, employee_id, originalDataStr]
    );

    const createdCertificates = [];
    if (certificates && certificates.length > 0) {
      for (const cert of certificates) {
        const certId = 'cert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        await pool.query(
          'INSERT INTO certificates (id, person_id, name, value) VALUES ($1, $2, $3, $4)',
          [certId, personId, cert.name, cert.value]
        );
        createdCertificates.push({ id: certId, person_id: personId, name: cert.name, value: cert.value });
      }
    }

    // 更新数据集计数
    await pool.query('UPDATE datasets SET count = count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [dataset_id]);

    const person = result.rows[0];
    if (person.original_data) {
      try {
        person.original_data = JSON.parse(person.original_data);
      } catch (e) {
        console.error('Error parsing original_data:', e);
      }
    }

    res.json({ ...person, certificates: createdCertificates });
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 批量创建人员（简化版，无事务）
router.post('/batch', async (req, res) => {
  try {
    const { dataset_id, persons } = req.body;

    if (!persons || persons.length === 0) {
      return res.status(400).json({ error: 'No persons to create' });
    }

    const createdPersons = [];

    for (const personData of persons) {
      const { name, age, education, major, employee_id, original_data, certificates } = personData;

      const originalDataStr = original_data ? JSON.stringify(original_data) : null;
      const personId = 'person-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

      try {
        const result = await pool.query(
          'INSERT INTO persons (id, dataset_id, name, age, education, major, employee_id, original_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
          [personId, dataset_id, name, age, education, major || null, employee_id, originalDataStr]
        );

        const createdCertificates = [];
        if (certificates && certificates.length > 0) {
          for (const cert of certificates) {
            const certId = 'cert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            await pool.query(
              'INSERT INTO certificates (id, person_id, name, value) VALUES ($1, $2, $3, $4)',
              [certId, personId, cert.name, cert.value]
            );
            createdCertificates.push({ id: certId, person_id: personId, name: cert.name, value: cert.value });
          }
        }

        const person = result.rows[0];
        if (person.original_data) {
          try {
            person.original_data = JSON.parse(person.original_data);
          } catch (e) {
            console.error('Error parsing original_data:', e);
          }
        }
        createdPersons.push({ ...person, certificates: createdCertificates });
      } catch (err) {
        console.error('Error creating person:', err);
        throw err;
      }
    }

    // 更新数据集计数
    await pool.query('UPDATE datasets SET count = count + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [persons.length, dataset_id]);

    res.json(createdPersons);
  } catch (error) {
    console.error('Batch create persons error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新人员
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, education, major, employee_id, original_data, certificates } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (age !== undefined) {
      updates.push(`age = $${paramIndex++}`);
      params.push(age);
    }
    if (education) {
      updates.push(`education = $${paramIndex++}`);
      params.push(education);
    }
    if (major !== undefined) {
      updates.push(`major = $${paramIndex++}`);
      params.push(major);
    }
    if (employee_id) {
      updates.push(`employee_id = $${paramIndex++}`);
      params.push(employee_id);
    }
    if (original_data !== undefined) {
      updates.push(`original_data = $${paramIndex++}`);
      params.push(JSON.stringify(original_data));
    }

    if (updates.length > 0) {
      const updateQuery = `UPDATE persons SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
      params.push(id);
      await pool.query(updateQuery, params);
    }

    if (certificates !== undefined) {
      await pool.query('DELETE FROM certificates WHERE person_id = $1', [id]);
      if (certificates.length > 0) {
        for (const cert of certificates) {
          const certId = 'cert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          await pool.query(
            'INSERT INTO certificates (id, person_id, name, value) VALUES ($1, $2, $3, $4)',
            [certId, id, cert.name, cert.value]
          );
        }
      }
    }

    const updatedPersonResult = await pool.query('SELECT * FROM persons WHERE id = $1', [id]);
    const updatedPerson = updatedPersonResult.rows[0];
    const certificatesResult = await pool.query('SELECT * FROM certificates WHERE person_id = $1', [id]);

    res.json({ ...updatedPerson, certificates: certificatesResult.rows });
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除人员
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const personResult = await pool.query('SELECT dataset_id FROM persons WHERE id = $1', [id]);
    if (personResult.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const datasetId = personResult.rows[0].dataset_id;

    await pool.query('DELETE FROM persons WHERE id = $1', [id]);
    await pool.query('UPDATE datasets SET count = count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [datasetId]);

    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Delete person error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 批量删除人员
router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: 'No ids provided' });
    }

    const datasetIds = new Set();
    for (const id of ids) {
      const personResult = await pool.query('SELECT dataset_id FROM persons WHERE id = $1', [id]);
      if (personResult.rows.length > 0) {
        datasetIds.add(personResult.rows[0].dataset_id);
      }
    }

    for (const id of ids) {
      await pool.query('DELETE FROM persons WHERE id = $1', [id]);
    }

    for (const datasetId of datasetIds) {
      const countResult = await pool.query('SELECT COUNT(*) as count FROM persons WHERE dataset_id = $1', [datasetId]);
      const newCount = parseInt(countResult.rows[0].count);
      await pool.query('UPDATE datasets SET count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newCount, datasetId]);
    }

    res.json({ message: `Successfully deleted ${ids.length} persons` });
  } catch (error) {
    console.error('Batch delete persons error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;