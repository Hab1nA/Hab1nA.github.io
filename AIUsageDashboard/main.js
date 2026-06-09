/**
 * Main application logic.
 */
import { providerRegistry } from './provider-registry.js';
import { getProviderConfig, setProviderConfig } from './config.js';
import { renderUsageTable, renderSettingsModal, renderLoading, renderError } from './ui.js';

// DOM elements
let usageContainer;
let refreshButton;
let settingsButton;
let statusMessage;

/**
 * Initialize the application.
 */
function init() {
  usageContainer = document.getElementById('usage-container');
  refreshButton = document.getElementById('refresh-btn');
  settingsButton = document.getElementById('settings-btn');
  statusMessage = document.getElementById('status-message');
  
  if (!usageContainer) {
    console.error('Usage container not found');
    return;
  }
  
  // Load providers
  providerRegistry.load();
  
  // Set up event listeners
  if (refreshButton) {
    refreshButton.addEventListener('click', fetchAndRender);
  }
  
  if (settingsButton) {
    settingsButton.addEventListener('click', openSettings);
  }
  
  // Initial load
  fetchAndRender();
}

/**
 * Fetch usage data from all providers and render.
 */
async function fetchAndRender() {
  renderLoading(usageContainer, '正在获取用量数据…');
  
  const providers = providerRegistry.getProviders();
  const results = [];
  
  for (const provider of providers) {
    try {
      const usage = await provider.fetchTodayUsage();
      results.push({
        ...usage,
        providerName: provider.getName()
      });
    } catch (error) {
      results.push({
        provider: provider.getId(),
        providerName: provider.getName(),
        date: new Date().toISOString().split('T')[0],
        tokensUsed: 0,
        costUSD: null,
        error: error.message
      });
    }
  }
  
  renderUsageTable(results, usageContainer);
  
  // Calculate total
  const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
  const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);
  
  if (statusMessage) {
    const configuredCount = results.filter(r => !r.error).length;
    statusMessage.textContent = `已配置 ${configuredCount} 个供应商，共 ${totalTokens.toLocaleString()} 个 Token`;
  }
}

/**
 * Open settings modal.
 */
function openSettings() {
  const providers = providerRegistry.getProviders();
  const configs = {};
  
  for (const provider of providers) {
    configs[provider.getId()] = getProviderConfig(provider.getId()) || {};
  }
  
  renderSettingsModal(providers, configs, (formData) => {
    // Save all configs
    for (const [providerId, config] of Object.entries(formData)) {
      setProviderConfig(providerId, config);
    }
    
    // Refresh data
    fetchAndRender();
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
