/**
 * UI module - handles rendering and user interactions.
 */

/**
 * Render the usage table.
 * @param {Object[]} data - Array of usage data objects
 * @param {HTMLElement} container 
 */
export function renderUsageTable(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty-state">暂无用量数据。</p>';
    return;
  }
  
  let html = `
    <table class="usage-table">
      <thead>
        <tr>
          <th>供应商</th>
          <th>日期</th>
          <th>已用 Token</th>
          <th>费用 (USD)</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  for (const row of data) {
    const statusClass = row.error ? 'error' : 'success';
    const statusText = row.error || '正常';
    const costDisplay = row.costUSD !== null ? `$${row.costUSD.toFixed(4)}` : '-';
    const tokensDisplay = row.tokensUsed > 0 ? row.tokensUsed.toLocaleString() : '0';
    
    html += `
      <tr>
        <td class="provider-name">${escapeHtml(row.providerName || row.provider)}</td>
        <td>${escapeHtml(row.date)}</td>
        <td class="tokens">${tokensDisplay}</td>
        <td class="cost">${costDisplay}</td>
        <td class="status ${statusClass}">${escapeHtml(statusText)}</td>
      </tr>
    `;
  }
  
  html += `
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

/**
 * Render provider settings modal.
 * @param {Object[]} providers - Array of provider instances
 * @param {Object} currentConfigs - Current configs by provider ID
 * @param {Function} onSave - Callback when save is clicked
 */
export function renderSettingsModal(providers, currentConfigs, onSave) {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  
  let html = '<div class="modal-content">';
  html += '<h2>供应商设置</h2>';
  html += '<form id="settings-form">';
  
  for (const provider of providers) {
    const schema = provider.getConfigSchema();
    const config = currentConfigs[provider.getId()] || {};
    
    html += `<div class="provider-section">`;
    html += `<h3>${escapeHtml(provider.getName())}</h3>`;
    
    for (const field of schema.fields) {
      const value = config[field.id] || field.default || '';
      const requiredAttr = field.required ? 'required' : '';
      
      html += `
        <div class="form-group">
          <label for="${provider.getId()}-${field.id}">${escapeHtml(field.label)}</label>
          <input 
            type="${field.type || 'text'}" 
            id="${provider.getId()}-${field.id}" 
            name="${provider.getId()}-${field.id}"
            value="${escapeHtml(value)}"
            placeholder="${escapeHtml(field.placeholder || '')}"
            ${requiredAttr}
            data-provider="${provider.getId()}"
            data-field="${field.id}"
          />
        </div>
      `;
    }
    
    html += `</div>`;
  }
  
  html += `
    <div class="modal-actions">
      <button type="submit" class="btn btn-primary">保存设置</button>
      <button type="button" class="btn btn-secondary" onclick="document.getElementById('settings-modal').style.display='none'">取消</button>
    </div>
  `;
  
  html += '</form></div>';
  
  modal.innerHTML = html;
  modal.style.display = 'flex';
  
  // Handle form submission
  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = {};
    
    for (const provider of providers) {
      const schema = provider.getConfigSchema();
      formData[provider.getId()] = {};
      
      for (const field of schema.fields) {
        const input = document.getElementById(`${provider.getId()}-${field.id}`);
        if (input) {
          formData[provider.getId()][field.id] = input.value;
        }
      }
    }
    
    onSave(formData);
    modal.style.display = 'none';
  });
}

/**
 * Render loading state.
 * @param {HTMLElement} container 
 * @param {string} message 
 */
export function renderLoading(container, message = '加载中…') {
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Render error state.
 * @param {HTMLElement} container 
 * @param {string} message 
 */
export function renderError(container, message) {
  container.innerHTML = `
    <div class="error-state">
      <p class="error-message">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS.
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
