# Provider Interface Specification

All providers must implement the following interface to be compatible with the AI Usage Dashboard.

## Required Methods

### `getId()`
Returns a unique string identifier for the provider.
```javascript
getId() {
  return 'my-provider'; // lowercase, no spaces
}
```

### `getName()`
Returns a human-readable display name.
```javascript
getName() {
  return 'My AI Provider';
}
```

### `getConfigSchema()`
Returns an object describing the configuration fields needed.
```javascript
getConfigSchema() {
  return {
    fields: [
      {
        id: 'apiKey',
        label: 'API Key',
        type: 'password',  // or 'text'
        required: true,
        placeholder: 'Enter your API key'
      }
      // ... more fields
    ]
  };
}
```

### `validateConfig(config)`
Validates whether a configuration object is valid.
```javascript
validateConfig(config) {
  return config && typeof config.apiKey === 'string' && config.apiKey.length > 0;
}
```

### `isConfigured()`
Checks if the provider has valid configuration stored.
```javascript
isConfigured() {
  const config = getProviderConfig(this.getId());
  return this.validateConfig(config);
}
```

### `fetchTodayUsage()`
Fetches today's usage data from the provider's API.
```javascript
async fetchTodayUsage() {
  // Returns object matching UsageRecord interface
}
```

## UsageRecord Interface

The `fetchTodayUsage()` method must return an object matching this interface:

```typescript
interface UsageRecord {
  provider: string;       // Provider ID (e.g., 'deepseek')
  date: string;           // ISO date string (YYYY-MM-DD)
  tokensUsed: number;     // Total tokens used today
  costUSD: number | null; // Cost in USD (null if unavailable)
  error: string | null;   // Error message (null if successful)
}
```

## Example Provider Implementation

```javascript
import { ProviderBase } from '../provider-base.js';
import { getProviderConfig } from '../config.js';

export class MyProvider extends ProviderBase {
  getId() { return 'my-provider'; }
  getName() { return 'My Provider'; }
  
  getConfigSchema() {
    return {
      fields: [
        { id: 'apiKey', label: 'API Key', type: 'password', required: true }
      ]
    };
  }
  
  validateConfig(config) {
    return config && config.apiKey;
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
    
    // Implement API call here
    const config = getProviderConfig(this.getId());
    // ...
    
    return {
      provider: this.getId(),
      date: new Date().toISOString().split('T')[0],
      tokensUsed: totalTokens,
      costUSD: totalCost,
      error: null
    };
  }
}
```

## Registration

After implementing a provider, register it in `provider-registry.js`:

```javascript
import { MyProvider } from './providers/my-provider.js';

const PROVIDER_MODULES = [
  // ... existing providers
  MyProvider
];
```
