/**
 * Volcengine provider implementation.
 * For ByteDance's Volcengine AI platform.
 */
import { ProviderBase } from '../provider-base.js';
import { getProviderConfig, hasProviderConfig } from '../config.js';

export class VolcengineProvider extends ProviderBase {
  constructor() {
    super();
    this.id = 'volcengine';
    this.name = 'Volcengine';
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
          placeholder: '输入你的火山引擎 API Key'
        },
        {
          id: 'apiBase',
          label: 'API 基础地址',
          type: 'text',
          required: false,
          placeholder: 'https://open.volcengineapi.com',
          default: 'https://open.volcengineapi.com'
        },
        {
          id: 'region',
          label: '区域',
          type: 'text',
          required: false,
          placeholder: 'cn-north-1',
          default: 'cn-north-1'
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
    const base = config.apiBase || 'https://open.volcengineapi.com';
    const region = config.region || 'cn-north-1';
    
    try {
      // Volcengine usage endpoint
      // Based on OpenViking's usage_audit pattern
      const response = await fetch(`${base}/v1/usage/today?region=${region}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Region': region
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
