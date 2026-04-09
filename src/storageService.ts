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
  id: number;
  name: string;
  age: number;
  education: string;
  major: string;
  certificates: string[];
  employeeId: string;
  certificateColumns: { [key: string]: string };
  originalData: any;
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
  // 优先使用环境变量
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 如果是生产环境（GitHub Pages/Vercel），使用相对路径或配置的 URL
  const isProduction = window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1';
  
  if (isProduction) {
    // 在生产环境中，API 应该部署在同一个域名下，或者使用配置的 URL
    // 这里假设 API 部署在 Render 上，URL 会在 .env 中配置
    return import.meta.env.VITE_API_URL || 'https://your-api.onrender.com/api';
  }
  
  // 本地开发环境
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

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

// 存储服务
export const storageService = {
  // 读取所有用户
  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const users = await response.json();
      console.log('✅ 读取用户数据成功:', users.length, '个用户');
      return toCamelCase(users);
    } catch (e) {
      console.error('❌ 读取用户数据失败', e);
      return [];
    }
  },

  // 创建用户
  createUser: async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toSnakeCase(userData))
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const user = await response.json();
      console.log('✅ 创建用户成功:', user.username);
      return toCamelCase(user);
    } catch (e) {
      console.error('❌ 创建用户失败', e);
      throw e;
    }
  },

  // 根据ID获取用户
  getUserById: async (id: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      const user = await response.json();
      return toCamelCase(user);
    } catch (e) {
      console.error('❌ 获取用户失败', e);
      return null;
    }
  },

  // 根据用户名获取用户
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

  // 更新用户
  updateUser: async (user: User): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toSnakeCase(user))
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      console.log('✅ 更新用户成功:', updatedUser.username);
      return toCamelCase(updatedUser);
    } catch (e) {
      console.error('❌ 更新用户失败', e);
      throw e;
    }
  },

  // 删除用户
  deleteUser: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      console.log('✅ 删除用户成功:', id);
    } catch (e) {
      console.error('❌ 删除用户失败', e);
      throw e;
    }
  },

  // 读取所有数据集
  getAllDataSets: async (): Promise<DataSet[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/datasets`);
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      const dataSets = await response.json();
      console.log('✅ 读取数据集成功:', dataSets.length, '个数据集');
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toSnakeCase(dataSetData))
      });

      if (!response.ok) {
        throw new Error('Failed to create dataset');
      }

      const dataSet = await response.json();
      console.log('✅ 创建数据集成功:', dataSet.name);
      return toCamelCase(dataSet);
    } catch (e) {
      console.error('❌ 创建数据集失败', e);
      throw e;
    }
  },

  // 根据ID获取数据集
  getDataSetById: async (id: string): Promise<DataSet | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/datasets/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }
      const dataSet = await response.json();
      return toCamelCase(dataSet);
    } catch (e) {
      console.error('❌ 获取数据集失败', e);
      return null;
    }
  },

  // 删除数据集
  deleteDataSet: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/datasets/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete dataset');
      }
      
      console.log('✅ 删除数据集成功:', id);
    } catch (e) {
      console.error('❌ 删除数据集失败', e);
      throw e;
    }
  },

  // 保存当前数据集ID
  saveCurrentDataSetId: (id: string): void => {
    try {
      localStorage.setItem('currentDataSetId', id);
      console.log('✅ 当前数据集ID已保存:', id);
    } catch (e) {
      console.error('❌ 保存当前数据集ID失败', e);
    }
  },

  // 获取当前数据集ID
  getCurrentDataSetId: (): string | null => {
    try {
      return localStorage.getItem('currentDataSetId');
    } catch (e) {
      console.error('❌ 获取当前数据集ID失败', e);
      return null;
    }
  },

  // 批量创建人员
  batchCreatePersons: async (datasetId: string, persons: any[]): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/persons/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dataset_id: datasetId, persons: toSnakeCase(persons) })
      });

      if (!response.ok) {
        throw new Error('Failed to create persons');
      }

      const createdPersons = await response.json();
      console.log('✅ 批量创建人员成功:', createdPersons.length, '人');
      return toCamelCase(createdPersons);
    } catch (e) {
      console.error('❌ 批量创建人员失败', e);
      throw e;
    }
  },

  getPersonsByDatasetId: async (datasetId: string): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/persons/dataset/${datasetId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch persons');
      }
      const persons = await response.json();
      return toCamelCase(persons);
    } catch (e) {
      console.error('❌ 获取人员数据失败', e);
      return [];
    }
  },

  // 清空所有数据
  clearAll: (): void => {
    try {
      localStorage.removeItem('currentDataSetId');
      localStorage.removeItem('filters');
      console.log('✅ 所有本地数据已清空');
    } catch (e) {
      console.error('❌ 清空数据失败', e);
    }
  }
};