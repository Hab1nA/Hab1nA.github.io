/**
 * Base class for all providers.
 * Providers should extend this class and implement all abstract methods.
 */
export class ProviderBase {
  /**
   * Get provider ID (unique slug, e.g., 'deepseek').
   * @returns {string}
   */
  getId() {
    throw new Error('getId() must be implemented');
  }
  
  /**
   * Get human-readable provider name.
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented');
  }
  
  /**
   * Get configuration schema for the provider.
   * @returns {Object} Schema object
   */
  getConfigSchema() {
    throw new Error('getConfigSchema() must be implemented');
  }
  
  /**
   * Validate provider configuration.
   * @param {Object} config - Configuration to validate
   * @returns {boolean}
   */
  validateConfig(config) {
    throw new Error('validateConfig() must be implemented');
  }
  
  /**
   * Check if provider is configured (has valid API key).
   * @returns {boolean}
   */
  isConfigured() {
    throw new Error('isConfigured() must be implemented');
  }
  
  /**
   * Fetch today's usage data from the provider.
   * @returns {Promise<Object>} Usage data
   */
  async fetchTodayUsage() {
    throw new Error('fetchTodayUsage() must be implemented');
  }
}
