/**
 * AI 路由 - 处理 AI 筛选请求
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

// AI 解析查询
router.post('/parse', async (req, res) => {
  try {
    const { query, provider, apiKey, baseUrl, model } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: '查询内容不能为空' });
    }

    console.log(`[AI] 收到查询: "${query}"`);
    console.log(`[AI] 使用提供商: ${provider || '默认'}`);

    // 构建 AI 请求
    const aiRequest = {
      query,
      provider: provider || 'openai',
      apiKey,
      baseUrl,
      model: model || 'gpt-3.5-turbo'
    };

    // 调用 AI 解析（这里简化处理，实际应调用 AI API）
    const parsedResult = parseQueryLocally(query);
    
    console.log(`[AI] 解析结果:`, parsedResult);
    
    res.json({
      success: true,
      data: parsedResult
    });
  } catch (error) {
    console.error('[AI] 解析错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 本地查询解析（简化版 AI）
function parseQueryLocally(query) {
  const result = {
    age: { min: null, max: null },
    education: [],
    certificates: [],
    major: null,
    keywords: []
  };

  // 解析年龄
  const ageMatch = query.match(/(\d+)\s*岁/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (query.includes('以下')) {
      result.age.max = age;
    } else if (query.includes('以上')) {
      result.age.min = age;
    } else {
      result.age.min = age - 2;
      result.age.max = age + 2;
    }
  }

  // 解析学历
  const educationKeywords = ['本科', '硕士', '博士', '大专', '高中'];
  educationKeywords.forEach(edu => {
    if (query.includes(edu)) {
      result.education.push(edu);
    }
  });

  // 解析证书（简单匹配）
  const certKeywords = ['PMP', 'CCNA', '软考', '建造师', '会计师'];
  certKeywords.forEach(cert => {
    if (query.toUpperCase().includes(cert.toUpperCase())) {
      result.certificates.push(cert);
    }
  });

  // 提取关键词
  result.keywords = query.split(/\s+/).filter(w => w.length > 1);

  return result;
}

module.exports = router;
