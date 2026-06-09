# AI Usage Dashboard

A unified dashboard to monitor AI API usage across multiple providers. Built with a decoupled, extensible architecture that makes it easy to add new providers.

## Features

- **Multi-provider support**: Track usage across DeepSeek, Xiaomi MiMo, Volcengine, ChatGPT Plus, and Packycode
- **Extensible architecture**: Add new providers by implementing a simple interface
- **Secure configuration**: API keys stored in browser localStorage
- **Real-time data**: Fetch today's usage from all configured providers
- **Responsive design**: Works on desktop and mobile

## Architecture

```
AIUsageDashboard/
├── index.html              # Main dashboard UI
├── main.js                 # Application logic
├── provider-registry.js    # Provider registration and loading
├── provider-base.js        # Base class for providers
├── config.js               # Configuration management (localStorage)
├── ui.js                   # UI rendering functions
├── test-utils.js           # Provider validation utilities
├── providers/              # Provider implementations
│   ├── deepseek.js
│   ├── mimo.js
│   ├── volcengine.js
│   ├── chatgpt.js
│   └── packycode.js
└── docs/
    └── interface.md        # Provider interface specification
```

### Key Components

1. **Provider Interface** (`provider-base.js`): Defines the contract all providers must implement
2. **Provider Registry** (`provider-registry.js`): Loads and manages provider instances
3. **Configuration Manager** (`config.js`): Handles API key storage in localStorage
4. **UI Module** (`ui.js`): Renders tables, modals, and status messages
5. **Main Application** (`main.js`): Orchestrates initialization and data fetching

## Adding a New Provider

To add a new AI provider, follow these steps:

### 1. Create Provider File

Create a new file in `providers/` (e.g., `providers/my-provider.js`):

```javascript
import { ProviderBase } from '../provider-base.js';
import { getProviderConfig } from '../config.js';

export class MyProvider extends ProviderBase {
  getId() { return 'my-provider'; }
  getName() { return 'My AI Provider'; }
  
  getConfigSchema() {
    return {
      fields: [
        {
          id: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your API key'
        }
      ]
    };
  }
  
  validateConfig(config) {
    return config && typeof config.apiKey === 'string' && config.apiKey.length > 0;
  }
  
  isConfigured() {
    const config = getProviderConfig(this.getId());
    return this.validateConfig(config);
  }
  
  async fetchTodayUsage() {
    if (!this.isConfigured()) {
      return {
        provider: this.getId(),
        date: new Date().toISOString().split('T')[0],
        tokensUsed: 0,
        costUSD: null,
        error: 'Not configured'
      };
    }
    
    const config = getProviderConfig(this.getId());
    
    try {
      // Implement your API call here
      const response = await fetch('https://api.example.com/usage', {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
      
      const data = await response.json();
      
      return {
        provider: this.getId(),
        date: new Date().toISOString().split('T')[0],
        tokensUsed: data.total_tokens || 0,
        costUSD: data.total_cost || null,
        error: null
      };
    } catch (error) {
      return {
        provider: this.getId(),
        date: new Date().toISOString().split('T')[0],
        tokensUsed: 0,
        costUSD: null,
        error: error.message
      };
    }
  }
}
```

### 2. Register Provider

Add the import to `provider-registry.js`:

```javascript
import { MyProvider } from './providers/my-provider.js';

const PROVIDER_MODULES = [
  // ... existing providers
  MyProvider
];
```

### 3. Test Your Provider

Open the dashboard in a browser and check the console for any validation errors. The provider should appear in the Settings modal.

## Configuration

API keys are stored in the browser's `localStorage` with keys prefixed `ai-usage-provider-config-{providerId}`.

To configure providers:
1. Click the **⚙️ Settings** button
2. Enter API keys for each provider
3. Click **Save Settings**

## Development

This is a static site with no build step required. Simply open `index.html` in a browser or serve the directory with any static file server.

### Testing Providers

The `test-utils.js` module provides validation functions. You can run provider tests from the browser console:

```javascript
import { providerRegistry } from './provider-registry.js';
import { runProviderTests } from './test-utils.js';

const providers = providerRegistry.getProviders();
const results = runProviderTests(providers);
console.table(results);
```

## Browser Compatibility

- Modern browsers with ES Module support (Chrome 61+, Firefox 60+, Safari 11+, Edge 79+)
- Requires `importmap` support or polyfill for older browsers

## Security Notes

- API keys are stored in `localStorage` and are accessible to any JavaScript on the same origin
- For production use, consider using a backend proxy to hide API keys
- Never commit API keys to version control

## License

Part of the [Hab1nA.github.io](https://github.com/Hab1nA/Hab1nA.github.io) repository.
