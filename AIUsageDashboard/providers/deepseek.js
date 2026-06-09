/**
 * Deepseek provider implementation.
 * Requires DEEPSEEK_API_KEY environment variable or configuration.
 */
import { ProviderBase } from '../provider-base.js';
import { getProviderConfig, hasProviderConfig } from '../config.js';

export class DeepseekProvider extends ProviderBase {
  constructor() {
    super();
    this.id = 'deepseek';
    this.name = 'DeepSeek';
  }
  
  getId() {
    return this.id;
  }
  
  getName() {
    return this.name;
  }
  
  getConfigSchema() {
    return {
      fields: [
        {
          id: 'apiKey',
          label: 'API 密钥',
          type: 'password',
          required: true,
          placeholder: '输入你的 DeepSeek API Key'
        },
        {
          id: 'apiBase',
          label: 'API 基础地址（可选）',
          type: 'text',
          required: false,
          placeholder: 'https://api.deepseek.com',
          default: 'https://api.deepseek.com'
        }
      ]
    };
  }
  
  validateConfig(config) {
    if (!config || !config.apiKey) {
      return false;
    }
    // Basic validation: key should look like a token
    return typeof config.apiKey === 'string' && config.apiKey.length > 10;
  }
  
  isConfigured() {
    const config = getProviderConfig(this.id);
    return this.validateConfig(config);
  }
  
  async fetchTodayUsage() {
    if (!this.isConfigured()) {
      return {
        provider: this.id,
        date: new Date().toISOString().split('T')[0],
        tokensUsed: 0,
        costUSD: null,
        error: 'API 密钥未配置'
      };
    }
    
    const config = getProviderConfig(this.id);
    const base = config.apiBase || 'https://api.deepseek.com';
    
    try {
      // DeepSeek usage endpoint (adjust based on actual API)
      const response = await fetch(`${base}/v1/usage`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Assuming DeepSeek returns: { data: { total_tokens, total_cost } }
      // Adjust based on actual API response
      return {
        provider: this.id,
        date: new Date().toISOString().split('T')[0],
        tokensUsed: data.total_tokens || 0,
        costUSD: data.total_cost || null,
        error: null
      };
    } catch (error) {
      return {
        provider: this.id,
        date: new Date().toISOString().split('T')[0],
        tokensUsed: 0,
        costUSD: null,
        error: error.message
      };
    }
  }
}
