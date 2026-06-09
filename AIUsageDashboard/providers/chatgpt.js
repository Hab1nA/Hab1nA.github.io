/**
 * ChatGPT Plus provider implementation.
 * Uses OpenAI's usage API (requires OpenAI API key).
 */
import { ProviderBase } from '../provider-base.js';
import { getProviderConfig, hasProviderConfig } from '../config.js';

export class ChatgptProvider extends ProviderBase {
  constructor() {
    super();
    this.id = 'chatgpt';
    this.name = 'ChatGPT Plus';
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
          label: 'OpenAI API 密钥',
          type: 'password',
          required: true,
          placeholder: '输入你的 OpenAI API Key'
        },
        {
          id: 'apiBase',
          label: 'API 基础地址',
          type: 'text',
          required: false,
          placeholder: 'https://api.openai.com',
          default: 'https://api.openai.com'
        }
      ]
    };
  }
  
  validateConfig(config) {
    if (!config || !config.apiKey) {
      return false;
    }
    // OpenAI keys typically start with 'sk-'
    return typeof config.apiKey === 'string' && config.apiKey.startsWith('sk-');
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
    const base = config.apiBase || 'https://api.openai.com';
    
    try {
      // OpenAI usage endpoint
      // Note: This may require organization-level access
      const response = await fetch(`${base}/v1/usage?date=${new Date().toISOString().split('T')[0]}`, {
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
      
      // Sum all model usages
      let totalTokens = 0;
      let totalCost = 0;
      
      if (data.data) {
        for (const usage of data.data) {
          totalTokens += usage.n_context_tokens_total || 0;
          totalTokens += usage.n_generated_tokens_total || 0;
          totalCost += usage.cost || 0;
        }
      }
      
      return {
        provider: this.id,
        date: new Date().toISOString().split('T')[0],
        tokensUsed: totalTokens,
        costUSD: totalCost > 0 ? totalCost : null,
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
