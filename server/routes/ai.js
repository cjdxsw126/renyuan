const express = require('express');
const router = express.Router();

const SYSTEM_PROMPT = `你是人才证书动态阈值筛选解析器。将用户自然语言输入转为严格JSON格式。

【输出JSON结构（必须严格遵守）】
{
  "cert_pool": ["证书名称1", "证书名称2"],
  "threshold": 数字N,
  "match_mode": "AT_LEAST"或"ALL"或"ANY",
  "name": null或姓名,
  "age_min": null或数字,
  "age_max": null或数字,
  "education": null或学历,
  "major": null或专业,
  "tenure_min": null或数字,
  "tenure_max": null或数字,
  "explanation": "简短中文说明"
}

## 二、字段说明
- **cert_pool**: 证书池，从用户输入中提取的所有候选证书名称数组
- **threshold**: 整数，需要满足的最少证书数量（N）
- **match_mode**: 匹配模式
  - "ALL": 必须具备cert_pool中**每一个**证书（等价于AND）
  - "AT_LEAST": 从cert_pool中**至少满足threshold个**即可（最常用）
  - "ANY": 具备cert_pool中**任意1个**即可（OR）

## 三、阈值识别规则（核心！）

### 模式判断优先级：

| 用户表达 | match_mode | threshold |
|----------|-----------|-----------|
| "同时具备全部"、"每一个都必须有"、"全部都要有" | ALL | cert_pool长度 |
| "至少N个"、"N个及以上"、"N个以上"、"拥有N种"、"具备N项" | AT_LEAST | N |
| "其中N个"、"其中N种"、"满足N项"、"达到N种"、"N种即可"、"N个就行" | AT_LEAST | N |
| "双证"/"两证" | AT_LEAST | 2 |
| "三证" | AT_LEAST | 3 |
| 只列举证书无任何数量词 | ALL | cert_pool长度 |
| 单个证书查询 | AT_LEAST | 1 |

### 数量词映射表：
- "一"/"1"/"一个" → 1, "二"/"2"/"两个"/"双" → 2, "三"/"3"/"三个"/"三证" → 3
- "四"/"4" → 4, "五"/"5" → 5, "六"/"6" → 6
- "半数以上"/"一半以上" → 向上取整(cert_pool长度/2)
- "大部分" → 向上取整(cert_pool长度*0.7)
- "少数" → 向下取整(cert_pool长度*0.3)

### 特殊场景：
- 用户说"项目经理资格"、"PM资格"、"五种资质" → 自动展开为5类PM证书池:
  ["高级工程师", "工程咨询师", "信息系统项目管理师", "系统集成项目经理", "PMP"]
- 用户说"PMP" → cert_pool=["PMP"], threshold=1
- 用户说"软考相关" → 展开为软考体系常见证书

## 四、证书类别参考（用于展开模糊表述）
1. 软考体系: 系统分析师、信息系统项目管理师、系统集成项目经理、系统架构设计师、网络规划设计师
2. 工信部: 高级工程师、通信工程师、网络安全工程师
3. 云服务: 阿里云认证、腾讯云认证、云架构师
4. 华为系: HCIA/HCIP/HCIE、H3CSE、CISP、ITSS
5. 运维: ITIL、CKA/CKS、Vmware、RHCE/RHCA(红帽)
6. 网络: CCNA/CCNP/CCIE(思科)
5. 数据库: OCP/OCM(Oracle/甲骨文)、MCSE(微软)
8. 项目管理: PMP、PgMP
9. 其他: 全媒体运营师、NDPD、计算机等级考试

## 五、其他筛选条件（可选）
- name: 姓名
- age_min / age_max: 年龄范围（数字，岁）
- education: 学历（专科/本科/硕士/博士）
- major: 专业
- tenure_min / tenure_max: 入司年限/毕业年限/工作年限（年）

### 年限识别规则：
| 用户表达 | tenure_min | tenure_max | 说明 |
|----------|-----------|-----------|------|
| "毕业10年"、"10年毕业"、"本科毕业10年" | 10 | null | 至少N年 |
| "工作10年"、"10年工作经验"、"从业10年" | 10 | null | 至少N年 |
| "5-10年"、"5到10年"、"5至10年经验" | 5 | 10 | 范围 |
| "不超过5年"、"5年以内"、"少于5年" | null | 5 | 上限 |
| "10年以上"、"超过10年"、"10年多" | 10 | null | 下限 |

## 六、示例

输入: "持有高级工程师、PMP，这些证书具备其中两种的人"
→ cert_pool:["高级工程师","PMP"], threshold=2, match_mode="AT_LEAST"

输入: "同时具备系统架构设计师和PMP"
→ cert_pool:["系统架构设计师","PMP"], threshold=2, match_mode="ALL"

输入: "项目负责人持有五种资质"
→ cert_pool:["高级工程师","工程咨询师","信息系统项目管理师","系统集成项目经理","PMP"], threshold=2, match_mode="AT_LEAST"

输入: "有PMP证书的"
→ cert_pool:["PMP"], threshold=1, match_mode="AT_LEAST"

输入: "本科毕业10年PMP的人"
→ cert_pool:["PMP"], threshold=1, match_mode="AT_LEAST", education:"本科", tenure_min:10

输入: "35岁以下有5年以上工作经验的软考证书持有人"
→ cert_pool:["系统分析师","信息系统项目管理师","系统集成项目经理","系统架构设计师","网络规划设计师"], threshold=1, match_mode="AT_LEAST", age_max:34, tenure_min:5

用户输入：{user_input}

请严格只输出JSON，不要包含其他文字：`;

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
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

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
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Qwen API error: ${response.status} - ${error}`);
    }

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
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Doubao API error: ${response.status} - ${error}`);
    }

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
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

function getProvider(providerType, config) {
  switch (providerType) {
    case 'deepseek':
      return new DeepSeekProvider(config);
    case 'qwen':
      return new QwenProvider(config);
    case 'doubao':
      return new DoubaoProvider(config);
    case 'custom':
      return new CustomProvider(config);
    default:
      throw new Error(`Unsupported provider: ${providerType}`);
  }
}

router.post('/smart-search', async (req, res) => {
  try {
    const { query, provider = 'deepseek', config } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: '查询内容不能为空' });
    }

    const aiConfig = config || {
      apiKey: process.env[`${provider.toUpperCase()}_API_KEY`] || '',
      model: process.env[`${provider.toUpperCase()}_MODEL`] || undefined,
      baseUrl: process.env[`${provider.toUpperCase()}_BASE_URL`] || undefined
    };

    if (!aiConfig.apiKey) {
      return res.status(400).json({ 
        error: '未配置 API Key，请在后台设置中配置 AI 服务',
        needConfig: true 
      });
    }

    console.log(`[Smart Search] Provider: ${provider}, Query: ${query.substring(0, 50)}...`);

    const ai = getProvider(provider, aiConfig);

    const userPrompt = SYSTEM_PROMPT.replace('{user_input}', query);
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT.split('用户输入：')[0] },
      { role: 'user', content: query }
    ];

    const startTime = Date.now();
    const rawResponse = await ai.chat(messages);
    const elapsed = Date.now() - startTime;

    console.log(`[Smart Search] AI Response (${elapsed}ms):`, rawResponse.substring(0, 200));

    let result;
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(rawResponse);
      }
    } catch (parseError) {
      console.error('[Smart Search] Parse error:', parseError.message);
      return res.status(500).json({ 
        error: 'AI 返回格式解析失败，请重试',
        rawResponse: rawResponse 
      });
    }

    const newFormat = result.cert_pool !== undefined;
    let output;

    if (newFormat) {
      let pool = (result.cert_pool || []).map((s) => String(s || '').trim()).filter(Boolean);
      let thresh = (result.threshold !== undefined && result.threshold !== null) ? parseInt(result.threshold) : 0;
      const mode = result.match_mode || 'AT_LEAST';

      if (thresh > pool.length && pool.length > 0) {
        thresh = pool.length;
      }

      output = {
        cert_pool: pool,
        threshold: thresh,
        match_mode: mode,
        name: result.name || null,
        age_min: result.age_min !== null ? Number(result.age_min) : null,
        age_max: result.age_max !== null ? Number(result.age_max) : null,
        education: result.education || null,
        major: result.major || null,
        tenure_min: result.tenure_min !== null ? Number(result.tenure_min) : null,
        tenure_max: result.tenure_max !== null ? Number(result.tenure_max) : null,
        explanation: result.explanation || ''
      };
    } else {
      const filters = result.filters || {};
      Object.keys(filters).forEach((key) => {
        if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
        if (key === 'certificates' && Array.isArray(filters[key])) {
          filters[key] = (filters[key]).filter(c => c && String(c).trim());
          if ((filters[key]).length === 0) delete filters[key];
        }
      });
      output = { ...filters, _legacy: true, explanation: result.explanation || '' };
    }

    console.log(`[Smart Search] Parsed:`, JSON.stringify(output).substring(0, 200));

    res.json({
      success: true,
      ...output,
      confidence: result.confidence || 0.8,
      provider: provider,
      elapsed: elapsed
    });

  } catch (error) {
    console.error('[Smart Search] Error:', error.message);
    res.status(500).json({ 
      error: error.message || '智能搜索失败，请稍后重试'
    });
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