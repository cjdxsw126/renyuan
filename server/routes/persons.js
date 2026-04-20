const express = require('express');
const pool = require('../db');

const router = express.Router();

// 获取所有人员（或按数据集筛选）
router.get('/', async (req, res) => {
  try {
    const { dataset_id } = req.query;
    
    let query = 'SELECT * FROM persons';
    let params = [];
    
    if (dataset_id) {
      query += ' WHERE dataset_id = $1';
      params.push(dataset_id);
    }
    
    const personsResult = await pool.query(query, params);
    
    if (personsResult.rows.length === 0) {
      return res.json([]);
    }
    
    // 一次性获取所有相关证书 - SQLite兼容：使用 IN 而非 ANY
    const personIds = personsResult.rows.map(p => p.id);
    if (personIds.length === 0) return res.json([]);
    const idPlaceholders = personIds.map((_, i) => `$${i + 1}`).join(', ');
    const certificatesResult = await pool.query(
      `SELECT * FROM certificates WHERE person_id IN (${idPlaceholders})`,
      personIds
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
      if (person.certificate_columns) {
        try {
          person.certificate_columns = JSON.parse(person.certificate_columns);
        } catch (e) {
          person.certificate_columns = {};
        }
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

router.get('/dataset/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;

    // 批量查询所有人员和证书（优化：减少数据库往返）
    const personsResult = await pool.query('SELECT * FROM persons WHERE dataset_id = $1', [datasetId]);

    if (personsResult.rows.length === 0) {
      return res.json([]);
    }

    // 一次性获取所有相关证书 - SQLite兼容：使用 IN 而非 ANY
    const personIds = personsResult.rows.map(p => p.id);
    const idPlaceholders = personIds.map((_, i) => `$${i + 1}`).join(', ');
    const certificatesResult = await pool.query(
      `SELECT * FROM certificates WHERE person_id IN (${idPlaceholders})`,
      personIds
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
      if (person.certificate_columns) {
        try {
          person.certificate_columns = JSON.parse(person.certificate_columns);
        } catch (e) {
          person.certificate_columns = {};
        }
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
    if (person.certificate_columns) {
      try {
        person.certificate_columns = JSON.parse(person.certificate_columns);
      } catch (e) {
        person.certificate_columns = {};
      }
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
    const { dataset_id, name, age, education, major, employee_id, original_data, certificates, tenure, graduation_tenure, certificate_columns } = req.body;
    const originalDataStr = original_data ? JSON.stringify(original_data) : null;
    const certColsStr = certificate_columns ? JSON.stringify(certificate_columns) : null;

    const result = await pool.query(
      'INSERT INTO persons (dataset_id, name, age, education, major, employee_id, original_data, tenure, graduation_tenure, certificate_columns) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
      [dataset_id, name, age || null, education || null, major || null, employee_id || null, originalDataStr, tenure || 0, graduation_tenure || 0, certColsStr]
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
    const BATCH_SIZE = 30;
    const totalBatches = Math.ceil(persons.length / BATCH_SIZE);
    console.log(`[Batch Import] 将分为 ${totalBatches} 批处理 (每批${BATCH_SIZE}条)`);

    var allPersonIds = [];
    var allCertificates = [];
    let useNumericId = false;

    for (let batchStart = 0; batchStart < persons.length; batchStart += BATCH_SIZE) {
      const batch = persons.slice(batchStart, batchStart + BATCH_SIZE);

      const batchIds = [];
      const personValues = [];

      for (const p of batch) {
        let preGeneratedId;
        if (useNumericId) {
          preGeneratedId = Date.now() + Math.floor(Math.random() * 1000000);
        } else {
          preGeneratedId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        batchIds.push(preGeneratedId);
        const originalDataStr = p.original_data ? JSON.stringify(p.original_data) : null;
        const certColsStr = p.certificate_columns ? JSON.stringify(p.certificate_columns) : null;
        personValues.push([preGeneratedId, dataset_id, p.name || null, p.age || null, p.education || null, p.major || null, p.employee_id || null, originalDataStr, p.tenure || 0, p.graduation_tenure || 0, certColsStr]);
      }

      try {
        const personInsertSQL = `INSERT INTO persons (id, dataset_id, name, age, education, major, employee_id, original_data, tenure, graduation_tenure, certificate_columns) VALUES ${batch.map((_, i) => {
          const offset = i * 11;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
        }).join(', ')}`;

        const flatValues = personValues.flat();
        await pool.query(personInsertSQL, flatValues);
        allPersonIds.push(...batchIds);
      } catch (insertError) {
        if (insertError.message && insertError.message.includes('invalid input syntax') && !useNumericId) {
          console.log(`⚠️ 字符串ID插入失败，切换为数字ID模式...`);
          console.log(`   错误详情: ${insertError.message}`);
          useNumericId = true;

          const numericBatchIds = [];
          const numericPersonValues = [];

          for (const p of batch) {
            const numericId = Date.now() + Math.floor(Math.random() * 1000000);
            numericBatchIds.push(numericId);
            const originalDataStr = p.original_data ? JSON.stringify(p.original_data) : null;
            const certColsStr = p.certificate_columns ? JSON.stringify(p.certificate_columns) : null;
            numericPersonValues.push([numericId, dataset_id, p.name || null, p.age || null, p.education || null, p.major || null, p.employee_id || null, originalDataStr, p.tenure || 0, p.graduation_tenure || 0, certColsStr]);
          }

          const personInsertSQL = `INSERT INTO persons (id, dataset_id, name, age, education, major, employee_id, original_data, tenure, graduation_tenure, certificate_columns) VALUES ${numericPersonValues.map((_, i) => {
            const offset = i * 11;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
          }).join(', ')}`;

          await pool.query(personInsertSQL, numericPersonValues.flat());
          allPersonIds.push(...numericBatchIds);
          console.log(`✅ 使用数字ID模式成功插入本批数据`);
        } else {
          throw insertError;
        }
      }

      for (let i = 0; i < batch.length; i++) {
        const person = batch[i];
        if (person.certificates && person.certificates.length > 0) {
          for (const cert of person.certificates) {
            allCertificates.push([batchIds[i] || allPersonIds[allPersonIds.length - batch.length + i], cert.name || cert, cert.value || (typeof cert === 'string' ? '有' : null)]);
          }
        }
      }
    }

    console.log(`[Batch Import] 人员插入完成: ${persons.length} 条, 耗时: ${Date.now() - startTime}ms`);

    if (allCertificates.length > 0) {
      const CERT_BATCH_SIZE = 200;
      for (let certStart = 0; certStart < allCertificates.length; certStart += CERT_BATCH_SIZE) {
        const certBatch = allCertificates.slice(certStart, certStart + CERT_BATCH_SIZE);
        const certInsertSQL = `INSERT INTO certificates (person_id, name, value) VALUES ${certBatch.map((_, i) => {
          const offset = i * 3;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
        }).join(', ')}`;
        await pool.query(certInsertSQL, certBatch.flat());
      }
      console.log(`[Batch Import] 证书插入完成: ${allCertificates.length} 条`);
    }

    await pool.query('UPDATE datasets SET count = count + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [persons.length, dataset_id]);
    console.log(`[Batch Import] 批量导入完成！总计: ${persons.length} 人员 + ${allCertificates.length} 证书, 总耗时: ${Date.now() - startTime}ms, 使用${useNumericId ? '数字' : '字符串'}ID`);

    res.json(persons.map((p, i) => ({ id: allPersonIds[i], dataset_id, name: p.name, age: p.age, education: p.education, major: p.major, employee_id: p.employee_id })));
  } catch (error) {
    console.error('Batch create persons error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, education, major, employee_id, original_data, certificates, tenure, graduation_tenure, certificate_columns } = req.body;
    const updates = [];
    const params = [];
    let paramIndex = 1;
    if (name) { updates.push(`name = $${paramIndex++}`); params.push(name); }
    if (age !== undefined && age !== null) { updates.push(`age = $${paramIndex++}`); params.push(age); }
    if (education) { updates.push(`education = $${paramIndex++}`); params.push(education); }
    if (major !== undefined && major !== null) { updates.push(`major = $${paramIndex++}`); params.push(major); }
    if (employee_id) { updates.push(`employee_id = $${paramIndex++}`); params.push(employee_id); }
    if (original_data !== undefined) { updates.push(`original_data = $${paramIndex++}`); params.push(JSON.stringify(original_data)); }
    if (tenure !== undefined) { updates.push(`tenure = $${paramIndex++}`); params.push(tenure); }
    if (graduation_tenure !== undefined) { updates.push(`graduation_tenure = $${paramIndex++}`); params.push(graduation_tenure); }
    if (certificate_columns !== undefined) { updates.push(`certificate_columns = $${paramIndex++}`); params.push(JSON.stringify(certificate_columns)); }
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