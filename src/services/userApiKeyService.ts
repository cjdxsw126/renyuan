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

// Debug: log API base URL on load
console.log('[DEBUG] API_BASE_URL:', API_BASE_URL);

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
    console.log('[DEBUG] getAuthHeaders - token exists:', !!token);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // 获取当前用户的所有API密钥
  async getAllApiKeys(): Promise<UserApiKeys> {
    console.log('[DEBUG] getAllApiKeys - calling:', `${API_BASE_URL}/user-api-keys`);
    try {
      const response = await fetch(`${API_BASE_URL}/user-api-keys`, {
        headers: this.getAuthHeaders()
      });
      console.log('[DEBUG] getAllApiKeys - response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] getAllApiKeys - error response:', errorText);
        throw new Error('Failed to get API keys');
      }

      const data = await response.json();
      console.log('[DEBUG] getAllApiKeys - success, data:', data);
      return data;
    } catch (error) {
      console.error('[DEBUG] getAllApiKeys error:', error);
      throw error;
    }
  }

  // 获取指定provider的API密钥
  async getApiKey(provider: string): Promise<ApiKeyConfig | null> {
    console.log('[DEBUG] getApiKey - calling:', `${API_BASE_URL}/user-api-keys/${provider}`);
    try {
      const response = await fetch(`${API_BASE_URL}/user-api-keys/${provider}`, {
        headers: this.getAuthHeaders()
      });
      console.log('[DEBUG] getApiKey - response status:', response.status);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] getApiKey - error response:', errorText);
        throw new Error('Failed to get API key');
      }

      const data = await response.json();
      console.log('[DEBUG] getApiKey - success, data:', data);
      return data;
    } catch (error) {
      console.error('[DEBUG] getApiKey error:', error);
      return null;
    }
  }

  // 保存API密钥
  async saveApiKey(provider: string, config: ApiKeyConfig): Promise<void> {
    const url = `${API_BASE_URL}/user-api-keys/${provider}`;
    console.log('[DEBUG] saveApiKey - calling:', url);
    console.log('[DEBUG] saveApiKey - config:', config);
    console.log('[DEBUG] saveApiKey - token:', localStorage.getItem('token')?.substring(0, 20) + '...');
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(config)
      });
      console.log('[DEBUG] saveApiKey - response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] saveApiKey - error response:', errorText);
        throw new Error('Failed to save API key: ' + errorText);
      }
      console.log('[DEBUG] saveApiKey - success');
    } catch (error) {
      console.error('[DEBUG] saveApiKey error:', error);
      throw error;
    }
  }

  // 删除API密钥
  async deleteApiKey(provider: string): Promise<void> {
    console.log('[DEBUG] deleteApiKey - calling:', `${API_BASE_URL}/user-api-keys/${provider}`);
    try {
      const response = await fetch(`${API_BASE_URL}/user-api-keys/${provider}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      console.log('[DEBUG] deleteApiKey - response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] deleteApiKey - error response:', errorText);
        throw new Error('Failed to delete API key');
      }
    } catch (error) {
      console.error('[DEBUG] deleteApiKey error:', error);
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
