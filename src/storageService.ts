// 类型定义
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'member';
  enabled: boolean;
  createdAt: Date;
  lastPasswordChange?: Date;
  permissions?: {
    fileUpload: boolean;
    search: boolean;
    download: boolean;
    adminPanel: boolean;
    dataDelete: boolean;
  };
}

export interface Person {
  id: number | string;
  name: string;
  age: number;
  education: string;
  major: string;
  certificates: string[];
  employeeId: string;
  certificateColumns: { [key: string]: string };
  tenure: number;
  graduationTenure: number;
  originalData: any;
  _matchScore?: number;
  _matchDetails?: string;
}

export interface DataSet {
  id: string;
  name: string;
  count: number;
  createdAt: Date;
  updatedAt?: Date;
  data?: Person[];
  certificateOptions: string[];
}

// API基础URL - 支持本地开发和云部署
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 默认使用本地后端
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

// 本地存储键名（仅用于UI状态，不用于数据持久化）
const LOCAL_STORAGE_KEYS = {
  CURRENT_DATASET: 'renyuan_current_dataset',
};

// snake_case 转 camelCase
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
    // 处理日期字符串
    if (result.createdAt && typeof result.createdAt === 'string') {
      result.createdAt = new Date(result.createdAt);
    }
    if (result.updatedAt && typeof result.updatedAt === 'string') {
      result.updatedAt = new Date(result.updatedAt);
    }
    if (result.lastPasswordChange && typeof result.lastPasswordChange === 'string') {
      result.lastPasswordChange = new Date(result.lastPasswordChange);
    }
    return result;
  }
  return obj;
}

// camelCase 转 snake_case
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
    }
    return result;
  }
  return obj;
}

// 存储服务 - 全部使用后端API，数据永久保存到数据库
export const storageService = {
  // ===== 用户管理（后端API）=====

  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      return toCamelCase(users);
    } catch (e) {
      console.error('❌ 读取用户数据失败', e);
      return [];
    }
  },

  createUser: async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSnakeCase(userData))
      });
      if (!response.ok) throw new Error('Failed to create user');
      const user = await response.json();
      return toCamelCase(user);
    } catch (e) {
      console.error('❌ 创建用户失败', e);
      throw e;
    }
  },

  getUserById: async (id: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      const user = await response.json();
      return toCamelCase(user);
    } catch (e) {
      console.error('❌ 获取用户失败', e);
      return null;
    }
  },

  getUserByUsername: async (username: string): Promise<User | null> => {
    try {
      const users = await storageService.getAllUsers();
      const user = users.find(u => u.username === username);
      return user || null;
    } catch (e) {
      console.error('❌ 获取用户失败', e);
      return null;
    }
  },

  updateUser: async (user: User): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSnakeCase(user))
      });
      if (!response.ok) throw new Error('Failed to update user');
      const updatedUser = await response.json();
      return toCamelCase(updatedUser);
    } catch (e) {
      console.error('❌ 更新用户失败', e);
      throw e;
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
    } catch (e) {
      console.error('❌ 删除用户失败', e);
      throw e;
    }
  },

  // ===== 数据集管理（后端API）=====

  getAllDataSets: async (): Promise<DataSet[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/datasets`);
      if (!response.ok) throw new Error('Failed to fetch datasets');
      const dataSets = await response.json();
      return toCamelCase(dataSets);
    } catch (e) {
      console.error('❌ 读取数据集失败', e);
      return [];
    }
  },

  createDataSet: async (dataSetData: Omit<DataSet, 'id' | 'createdAt'>): Promise<DataSet> => {
    try {
      const response = await fetch(`${API_BASE_URL}/datasets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dataSetData.name,
          count: 0,
          certificate_options: dataSetData.certificateOptions || []
        })
      });
      if (!response.ok) throw new Error('Failed to create dataset');
      const dataSet = await response.json();
      return toCamelCase(dataSet);
    } catch (e) {
      console.error('❌ 创建数据集失败', e);
      throw e;
    }
  },

  getDataSetById: async (id: string): Promise<DataSet | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/datasets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch dataset');
      const dataSet = await response.json();
      return toCamelCase(dataSet);
    } catch (e) {
      console.error('❌ 获取数据集失败', e);
      return null;
    }
  },

  deleteDataSet: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/datasets/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete dataset');
    } catch (e) {
      console.error('❌ 删除数据集失败', e);
      throw e;
    }
  },

  // ===== 当前数据集ID（localStorage，仅UI状态）=====

  saveCurrentDataSetId: (id: string): void => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_DATASET, id);
    } catch (e) {
      console.error('❌ 保存当前数据集ID失败', e);
    }
  },

  getCurrentDataSetId: (): string | null => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_DATASET);
    } catch (e) {
      console.error('❌ 获取当前数据集ID失败', e);
      return null;
    }
  },

  // ===== 人员数据管理（后端API）=====

  batchCreatePersons: async (datasetId: string, persons: any[]): Promise<any[]> => {
    try {
      console.log('📦 使用后端存储模式 - 批量导入人员数据');
      const BATCH_SIZE = 50;
      const allResults = [];

      for (let i = 0; i < persons.length; i += BATCH_SIZE) {
        const batch = persons.slice(i, i + BATCH_SIZE);
        console.log(`📤 正在发送第 ${Math.floor(i / BATCH_SIZE) + 1} 批 (${batch.length} 条)...`);

        const response = await fetch(`${API_BASE_URL}/persons/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataset_id: datasetId,
            persons: batch.map(p => ({
              name: p.name,
              age: p.age || null,
              education: p.education || null,
              major: p.major || null,
              employee_id: p.employeeId || null,
              original_data: p.originalData || null,
              tenure: p.tenure || 0,
              graduation_tenure: p.graduationTenure || 0,
              certificate_columns: p.certificateColumns || {},
              certificates: (p.certificates || []).map((cert: any) =>
                typeof cert === 'string'
                  ? { name: cert, value: '有' }
                  : { name: cert.name || cert, value: cert.value || '有' }
              )
            }))
          })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || `批量导入失败 (${response.status}) - 第 ${Math.floor(i / BATCH_SIZE) + 1} 批`);
        }

        const result = await response.json();
        allResults.push(...(result.persons || result));

        // 避免请求过快
        if (i + BATCH_SIZE < persons.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`✅ 后端批量导入完成: ${persons.length} 条记录已保存到数据库`);
      return allResults;
    } catch (e) {
      console.error('❌ 批量创建人员失败', e);
      throw e;
    }
  },

  getPersonsByDatasetId: async (datasetId: string): Promise<Person[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/persons/dataset/${datasetId}`);
      if (!response.ok) throw new Error('Failed to fetch persons');

      const rawPersons = await response.json();

      // 转换为前端Person格式
      return rawPersons.map((p: any) => ({
        id: p.id,
        name: p.name,
        age: p.age || 0,
        education: p.education || '',
        major: p.major || '',
        employeeId: p.employee_id || '',
        certificates: (p.certificates || []).map((c: any) => c.name || c),
        certificateColumns: p.certificate_columns || {},
        tenure: p.tenure || 0,
        graduationTenure: p.graduation_tenure || 0,
        originalData: p.original_data || {}
      }));
    } catch (e) {
      console.error('❌ 获取人员数据失败', e);
      return [];
    }
  },

  // ===== 数据清空 =====

  clearAll: (): void => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_DATASET);
    } catch (e) {
      console.error('❌ 清空本地状态失败', e);
    }
  },

  // ===== AI 智能搜索（后端API）=====

  smartSearch: async (query: string, provider: string = 'deepseek', config?: any): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/smart-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ query, provider, config })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        const text = await response.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('AI 服务未部署');
        }
        throw new Error(`服务器返回异常响应 (${response.status})`);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `请求失败 (${response.status})`);
      }
      const result = await response.json();
      return result;
    } catch (e: any) {
      console.error('❌ AI 智能搜索失败', e);
      if (e.message?.includes('fetch') || e.message?.includes('network') || e.message?.includes('Failed to fetch')) {
        throw new Error('无法连接到 AI 服务，请检查网络连接');
      }
      throw e;
    }
  },

  getAIProviders: async (): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/providers`);
      if (!response.ok) throw new Error('Failed to fetch providers');
      return await response.json();
    } catch (e) {
      console.error('❌ 获取 AI 提供商失败', e);
      return [];
    }
  },

  // AI 配置（localStorage，纯客户端配置）
  saveAIConfig: (config: any): void => {
    try {
      localStorage.setItem('ai_config', JSON.stringify(config));
    } catch (e) {
      console.error('❌ 保存 AI 配置失败', e);
    }
  },

  getAIConfig: (): any => {
    try {
      const config = localStorage.getItem('ai_config');
      return config ? JSON.parse(config) : null;
    } catch (e) {
      return null;
    }
  }
};
