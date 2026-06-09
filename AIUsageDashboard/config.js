/**
 * Configuration manager - handles storage and retrieval of provider configs.
 * Uses localStorage for persistence.
 */
const STORAGE_KEY_PREFIX = 'ai-usage-provider-config-';

/**
 * Get provider configuration.
 * @param {string} providerId 
 * @returns {Object|null}
 */
export function getProviderConfig(providerId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + providerId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save provider configuration.
 * @param {string} providerId 
 * @param {Object} config 
 */
export function setProviderConfig(providerId, config) {
  localStorage.setItem(STORAGE_KEY_PREFIX + providerId, JSON.stringify(config));
}

/**
 * Clear provider configuration.
 * @param {string} providerId 
 */
export function clearProviderConfig(providerId) {
  localStorage.removeItem(STORAGE_KEY_PREFIX + providerId);
}

/**
 * Check if provider has configuration.
 * @param {string} providerId 
 * @returns {boolean}
 */
export function hasProviderConfig(providerId) {
  return localStorage.getItem(STORAGE_KEY_PREFIX + providerId) !== null;
}

/**
 * Get all configured provider IDs.
 * @returns {string[]}
 */
export function getConfiguredProviders() {
  const providers = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      providers.push(key.slice(STORAGE_KEY_PREFIX.length));
    }
  }
  return providers;
}
