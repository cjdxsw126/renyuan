// Get API base URL based on current environment
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Use cloud backend for production, localhost for development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  // GitHub Pages uses cloud backend
  return 'https://xuanren-1.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiKeyConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface UserApiKeys {
  [provider: string]: ApiKeyConfig;
}

class UserApiKeyService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // 获取当前用户的所有API密钥
  async getAllApiKeys(): Promise<UserApiKeys> {
    try {
      const response = await fetch(`${API_BASE_URL}/user-api-keys`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to get API keys');
      }

      return await response.json();
    } catch (error) {
      console.error('Get API keys error:', error);
      throw error;
    }
  }

  // 获取指定provider的API密钥
  async getApiKey(provider: string): Promise<ApiKeyConfig | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/user-api-keys/${provider}`, {
        headers: this.getAuthHeaders()
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to get API key');
      }

      return await response.json();
    } catch (error) {
      console.error('Get API key error:', error);
      return null;
    }
  }

  // 保存API密钥
  async saveApiKey(provider: string, config: ApiKeyConfig): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/user-api-keys/${provider}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to save API key');
      }
    } catch (error) {
      console.error('Save API key error:', error);
      throw error;
    }
  }

  // 删除API密钥
  async deleteApiKey(provider: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/user-api-keys/${provider}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }
    } catch (error) {
      console.error('Delete API key error:', error);
      throw error;
    }
  }

  // 检查是否已配置某个provider的API密钥
  async hasApiKey(provider: string): Promise<boolean> {
    const key = await this.getApiKey(provider);
    return key !== null && key.apiKey !== '';
  }
}

export const userApiKeyService = new UserApiKeyService();
