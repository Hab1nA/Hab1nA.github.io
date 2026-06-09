/**
 * Mimo provider implementation.
 * For Xiaomi's MIMO token plan.
 */
import { ProviderBase } from '../provider-base.js';
import { getProviderConfig, hasProviderConfig } from '../config.js';

export class MimoProvider extends ProviderBase {
  constructor() {
    super();
    this.id = 'mimo';
    this.name = 'Xiaomi MiMo';
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
          placeholder: '输入你的 MiMo API Key'
        },
        {
          id: 'apiBase',
          label: 'API 基础地址',
          type: 'text',
          required: false,
          placeholder: 'https://api.mimo.ai',
          default: 'https://api.mimo.ai'
        }
      ]
    };
  }
  
  validateConfig(config) {
    if (!config || !config.apiKey) {
      return false;
    }
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
    const base = config.apiBase || 'https://api.mimo.ai';
    
    try {
      // MiMo usage endpoint (adjust based on actual API)
      const response = await fetch(`${base}/v1/usage/today`, {
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
