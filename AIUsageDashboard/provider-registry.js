/**
 * Provider registry - loads and manages all provider modules.
 * New providers are added by creating a file in ./providers/ and
 * registering it in PROVIDER_MODULES below.
 */
import { assert } from './test-utils.js';

// Import all provider modules
import { DeepseekProvider } from './providers/deepseek.js';
import { MimoProvider } from './providers/mimo.js';
import { VolcengineProvider } from './providers/volcengine.js';
import { ChatgptProvider } from './providers/chatgpt.js';
import { PackycodeProvider } from './providers/packycode.js';

// Register all providers here
const PROVIDER_MODULES = [
  DeepseekProvider,
  MimoProvider,
  VolcengineProvider,
  ChatgptProvider,
  PackycodeProvider
];

/**
 * Provider registry instance.
 */
export const providerRegistry = {
  _providers: [],
  _isLoaded: false,
  
  /**
   * Load and validate all registered providers.
   */
  load() {
    this._providers = [];
    this._isLoaded = true;
    
    for (const ProviderClass of PROVIDER_MODULES) {
      try {
        const provider = new ProviderClass();
        
        // Validate required methods
        const requiredMethods = ['getId', 'getName', 'getConfigSchema', 'validateConfig', 'isConfigured', 'fetchTodayUsage'];
        for (const method of requiredMethods) {
          assert(typeof provider[method] === 'function', 
            `Provider ${ProviderClass.name} missing required method: ${method}`);
        }
        
        // Validate required properties
        assert(provider.getId && typeof provider.getId === 'function', 
          `Provider ${ProviderClass.name} must implement getId()`);
        
        this._providers.push(provider);
      } catch (error) {
        console.error(`Failed to load provider ${ProviderClass.name}:`, error);
      }
    }
    
    return this._providers;
  },
  
  /**
   * Get all loaded providers.
   */
  getProviders() {
    if (!this._isLoaded) {
      this.load();
    }
    return this._providers;
  },
  
  /**
   * Get provider by ID.
   */
  getProvider(id) {
    return this._providers.find(p => p.getId() === id);
  },
  
  /**
   * Get all provider IDs.
   */
  getProviderIds() {
    return this._providers.map(p => p.getId());
  },
  
  /**
   * Get all provider names.
   */
  getProviderNames() {
    return this._providers.map(p => p.getName());
  }
};
