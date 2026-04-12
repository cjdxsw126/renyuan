const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/dataset/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;

    // 批量查询所有人员和证书（优化：减少数据库往返）
    const personsResult = await pool.query('SELECT * FROM persons WHERE dataset_id = $1', [datasetId]);

    if (personsResult.rows.length === 0) {
      return res.json([]);
    }

    // 一次性获取所有相关证书
    const personIds = personsResult.rows.map(p => p.id);
    const certificatesResult = await pool.query(
      'SELECT * FROM certificates WHERE person_id = ANY($1)',
      [personIds]
    );

    // 按 person_id 分组证书
    const certsByPersonId = {};
    for (const cert of certificatesResult.rows) {
      if (!certsByPersonId[cert.person_id]) {
        certsByPersonId[cert.person_id] = [];
      }
      certsByPersonId[cert.person_id].push(cert);
    }

    // 组装结果
    const personsWithCertificates = personsResult.rows.map(person => {
      if (person.original_data) {
        try {
          person.original_data = JSON.parse(person.original_data);
        } catch (e) {}
      }
      return {
        ...person,
        certificates: certsByPersonId[person.id] || []
      };
    });

    res.json(personsWithCertificates);
  } catch (error) {
    console.error('Get persons error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
      } catch (e) {}
    }
    const certificatesResult = await pool.query('SELECT * FROM certificates WHERE person_id = $1', [id]);

    res.json({ ...person, certificates: certificatesResult.rows });
  } catch (error) {
    console.error('Get person error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { dataset_id, name, age, education, major, employee_id, original_data, certificates } = req.body;
    const originalDataStr = original_data ? JSON.stringify(original_data) : null;

    const result = await pool.query(
      'INSERT INTO persons (dataset_id, name, age, education, major, employee_id, original_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [dataset_id, name, age || null, education || null, major || null, employee_id || null, originalDataStr]
    );
    const personId = result.rows[0].id;

    const createdCertificates = [];
    if (certificates && certificates.length > 0) {
      for (const cert of certificates) {
        const certResult = await pool.query(
          'INSERT INTO certificates (person_id, name, value) VALUES ($1, $2, $3) RETURNING id',
          [personId, cert.name, cert.value || null]
        );
        createdCertificates.push({ id: certResult.rows[0].id, person_id: personId, name: cert.name, value: cert.value });
      }
    }
    await pool.query('UPDATE datasets SET count = count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [dataset_id]);
    res.json({ id: personId, dataset_id, name, age, education, major, employee_id, original_data, certificates: createdCertificates });
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { dataset_id, persons } = req.body;
    if (!persons || persons.length === 0) return res.status(400).json({ error: 'No persons to create' });
    console.log(`[Batch Import] 开始批量导入 ${persons.length} 条数据...`);
    const startTime = Date.now();

    const personValues = [];
    for (const p of persons) {
      const originalDataStr = p.original_data ? JSON.stringify(p.original_data) : null;
      personValues.push([dataset_id, p.name || null, p.age || null, p.education || null, p.major || null, p.employee_id || null, originalDataStr]);
    }

    const personInsertSQL = `INSERT INTO persons (dataset_id, name, age, education, major, employee_id, original_data) VALUES ${persons.map((_, i) => {
      const offset = i * 7;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    }).join(', ')} RETURNING id`;

    const flatValues = personValues.flat();
    const personResult = await pool.query(personInsertSQL, flatValues);
    const personIds = personResult.rows.map(r => r.id);
    console.log(`[Batch Import] 人员插入完成: ${persons.length} 条, 耗时: ${Date.now() - startTime}ms`);

    const allCertificates = [];
    for (let i = 0; i < persons.length; i++) {
      const person = persons[i];
      if (person.certificates && person.certificates.length > 0) {
        for (const cert of person.certificates) {
          allCertificates.push([personIds[i], cert.name || cert, cert.value || (typeof cert === 'string' ? '有' : null)]);
        }
      }
    }

    if (allCertificates.length > 0) {
      const certInsertSQL = `INSERT INTO certificates (person_id, name, value) VALUES ${allCertificates.map((_, i) => {
        const offset = i * 3;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      }).join(', ')}`;
      await pool.query(certInsertSQL, allCertificates.flat());
      console.log(`[Batch Import] 证书插入完成: ${allCertificates.length} 条`);
    }

    await pool.query('UPDATE datasets SET count = count + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [persons.length, dataset_id]);
    console.log(`[Batch Import] 批量导入完成！总计: ${persons.length} 人员 + ${allCertificates.length} 证书, 总耗时: ${Date.now() - startTime}ms`);

    res.json(persons.map((p, i) => ({ id: personIds[i], dataset_id, name: p.name, age: p.age, education: p.education, major: p.major, employee_id: p.employee_id })));
  } catch (error) {
    console.error('Batch create persons error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, education, major, employee_id, original_data, certificates } = req.body;
    const updates = [];
    const params = [];
    let paramIndex = 1;
    if (name) { updates.push(`name = $${paramIndex++}`); params.push(name); }
    if (age !== undefined && age !== null) { updates.push(`age = $${paramIndex++}`); params.push(age); }
    if (education) { updates.push(`education = $${paramIndex++}`); params.push(education); }
    if (major !== undefined && major !== null) { updates.push(`major = $${paramIndex++}`); params.push(major); }
    if (employee_id) { updates.push(`employee_id = $${paramIndex++}`); params.push(employee_id); }
    if (original_data !== undefined) { updates.push(`original_data = $${paramIndex++}`); params.push(JSON.stringify(original_data)); }
    if (updates.length > 0) {
      const updateQuery = `UPDATE persons SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
      params.push(id);
      await pool.query(updateQuery, params);
    }
    if (certificates !== undefined) {
      await pool.query('DELETE FROM certificates WHERE person_id = $1', [id]);
      if (certificates.length > 0) {
        for (const cert of certificates) {
          await pool.query('INSERT INTO certificates (person_id, name, value) VALUES ($1, $2, $3)', [id, cert.name, cert.value || null]);
        }
      }
    }
    const updatedPersonResult = await pool.query('SELECT * FROM persons WHERE id = $1', [id]);
    const certificatesResult = await pool.query('SELECT * FROM certificates WHERE person_id = $1', [id]);
    res.json({ ...updatedPersonResult.rows[0], certificates: certificatesResult.rows });
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const personResult = await pool.query('SELECT dataset_id FROM persons WHERE id = $1', [id]);
    if (personResult.rows.length === 0) return res.status(404).json({ error: 'Person not found' });
    const datasetId = personResult.rows[0].dataset_id;
    await pool.query('DELETE FROM persons WHERE id = $1', [id]);
    await pool.query('UPDATE datasets SET count = count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [datasetId]);
    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Delete person error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ error: 'No ids provided' });
    const datasetIds = new Set();
    for (const id of ids) {
      const personResult = await pool.query('SELECT dataset_id FROM persons WHERE id = $1', [id]);
      if (personResult.rows.length > 0) datasetIds.add(personResult.rows[0].dataset_id);
    }
    for (const id of ids) await pool.query('DELETE FROM persons WHERE id = $1', [id]);
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
