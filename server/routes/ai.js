const express = require('express');
const router = express.Router();

const SYSTEM_PROMPT = `你是一个人员筛选系统的智能助手。根据用户的自然语言描述，提取结构化的筛选条件。

可用字段及说明：
- name: 姓名（精确匹配或模糊匹配）
- age_min / age_max: 年龄范围（数字，单位：岁）
- education: 学历（可选值：专科、本科、硕士、博士、不限）
- major: 专业名称
- certificates: 证书/资格名称列表
- tenure_min / tenure_max: 入司年限范围（单位：年）
- is_full_time: 是否全日制（true/false）

规则：
1. 如果用户提到"以下"、"以内"、"不超过"，使用对应字段作为最大值
2. 如果用户提到"以上"、"超过"、"至少"，使用对应字段作为最小值
3. "左右"、"大约"可以设置合理的上下浮动范围（±2年）
4. 学历相关：大专=专科，研究生=硕士或博士
5. 多个条件之间是 AND 关系

用户输入：{user_input}

请严格输出JSON格式，不要包含任何其他文字：
{
  "filters": {
    "name": null,
    "age_min": null,
    "age_max": null,
    "education": null,
    "major": null,
    "certificates": [],
    "tenure_min": null,
    "tenure_max": null,
    "is_full_time": null
  },
  "confidence": 0.95,
  "explanation": "对用户意图的简短解释"
}`;

class AIProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'default';
    this.baseUrl = config.baseUrl;
  }
  async chat(messages) {
    throw new Error('Subclass must implement chat method');
  }
}

class DeepSeekProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com';
    this.model = config.model || 'deepseek-chat';
  }
  async chat(messages) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.1, max_tokens: 1000 })
    });
    if (!response.ok) { const error = await response.text(); throw new Error(`DeepSeek API error: ${response.status} - ${error}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

class QwenProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.model = config.model || 'qwen-plus';
  }
  async chat(messages) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.1, max_tokens: 1000 })
    });
    if (!response.ok) { const error = await response.text(); throw new Error(`Qwen API error: ${response.status} - ${error}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

class DoubaoProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
    this.model = config.model || 'doubao-pro-32k';
  }
  async chat(messages) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.1, max_tokens: 1000 })
    });
    if (!response.ok) { const error = await response.text(); throw new Error(`Doubao API error: ${response.status} - ${error}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

class CustomProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl;
    this.model = config.model || 'gpt-3.5-turbo';
  }
  async chat(messages) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.1, max_tokens: 1000 })
    });
    if (!response.ok) { const error = await response.text(); throw new Error(`Custom API error: ${response.status} - ${error}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

function getProvider(providerType, config) {
  switch (providerType) {
    case 'deepseek': return new DeepSeekProvider(config);
    case 'qwen': return new QwenProvider(config);
    case 'doubao': return new DoubaoProvider(config);
    case 'custom': return new CustomProvider(config);
    default: throw new Error(`Unsupported provider: ${providerType}`);
  }
}

router.post('/smart-search', async (req, res) => {
  try {
    const { query, provider = 'deepseek', config } = req.body;
    if (!query || !query.trim()) return res.status(400).json({ error: '查询内容不能为空' });
    const aiConfig = config || {
      apiKey: process.env[`${provider.toUpperCase()}_API_KEY`] || '',
      model: process.env[`${provider.toUpperCase()}_MODEL`] || undefined,
      baseUrl: process.env[`${provider.toUpperCase()}_BASE_URL`] || undefined
    };
    if (!aiConfig.apiKey) return res.status(400).json({ error: '未配置 API Key', needConfig: true });
    console.log(`[Smart Search] Provider: ${provider}, Query: ${query.substring(0, 50)}...`);
    const ai = getProvider(provider, aiConfig);
    const userPrompt = SYSTEM_PROMPT.replace('{user_input}', query);
    const messages = [
      { role: 'system', content: '你是一个专业的数据筛选助手，只输出严格的JSON格式结果。' },
      { role: 'user', content: userPrompt }
    ];
    const startTime = Date.now();
    const rawResponse = await ai.chat(messages);
    const elapsed = Date.now() - startTime;
    let result;
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResponse);
    } catch (parseError) {
      return res.status(500).json({ error: 'AI 返回格式解析失败，请重试', rawResponse });
    }
    const filters = result.filters || {};
    Object.keys(filters).forEach(key => {
      if (filters[key] == null || filters[key] === '') delete filters[key];
      if (key === 'certificates' && Array.isArray(filters[key])) {
        filters[key] = filters[key].filter(c => c && c.trim());
        if (filters[key].length === 0) delete filters[key];
      }
    });
    res.json({ success: true, filters, confidence: result.confidence || 0.8, explanation: result.explanation || '', provider, elapsed });
  } catch (error) {
    console.error('[Smart Search] Error:', error.message);
    res.status(500).json({ error: error.message || '智能搜索失败，请稍后重试' });
  }
});

router.get('/providers', (req, res) => {
  res.json([
    { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek 深度求索', baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
    { id: 'qwen', name: '通义千问', description: '阿里云通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus' },
    { id: 'doubao', name: '豆包', description: '字节跳动豆包大模型', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-pro-32k' },
    { id: 'custom', name: '自定义 (OpenAI兼容)', description: '支持 OpenAI 格式的 API', baseUrl: '', defaultModel: 'gpt-3.5-turbo' }
  ]);
});

module.exports = router;