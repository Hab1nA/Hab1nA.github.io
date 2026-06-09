/**
 * Test utilities for provider validation.
 */

/**
 * Assert a condition is true.
 * @param {boolean} condition 
 * @param {string} message 
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Run provider validation tests.
 * @param {Object[]} providers 
 * @returns {Object[]} Test results
 */
export function runProviderTests(providers) {
  const results = [];
  
  for (const provider of providers) {
    const testResult = {
      provider: provider.getId(),
      name: provider.getName(),
      passed: 0,
      failed: 0,
      errors: []
    };
    
    // Test 1: Required methods exist
    const requiredMethods = ['getId', 'getName', 'getConfigSchema', 'validateConfig', 'isConfigured', 'fetchTodayUsage'];
    for (const method of requiredMethods) {
      if (typeof provider[method] === 'function') {
        testResult.passed++;
      } else {
        testResult.failed++;
        testResult.errors.push(`Missing method: ${method}`);
      }
    }
    
    // Test 2: getId returns string
    try {
      const id = provider.getId();
      assert(typeof id === 'string' && id.length > 0, 'getId() must return non-empty string');
      testResult.passed++;
    } catch (e) {
      testResult.failed++;
      testResult.errors.push(e.message);
    }
    
    // Test 3: getName returns string
    try {
      const name = provider.getName();
      assert(typeof name === 'string' && name.length > 0, 'getName() must return non-empty string');
      testResult.passed++;
    } catch (e) {
      testResult.failed++;
      testResult.errors.push(e.message);
    }
    
    // Test 4: getConfigSchema returns object with fields
    try {
      const schema = provider.getConfigSchema();
      assert(schema && Array.isArray(schema.fields), 'getConfigSchema() must return object with fields array');
      testResult.passed++;
    } catch (e) {
      testResult.failed++;
      testResult.errors.push(e.message);
    }
    
    // Test 5: validateConfig returns boolean
    try {
      const result = provider.validateConfig({});
      assert(typeof result === 'boolean', 'validateConfig() must return boolean');
      testResult.passed++;
    } catch (e) {
      testResult.failed++;
      testResult.errors.push(e.message);
    }
    
    // Test 6: isConfigured returns boolean
    try {
      const result = provider.isConfigured();
      assert(typeof result === 'boolean', 'isConfigured() must return boolean');
      testResult.passed++;
    } catch (e) {
      testResult.failed++;
      testResult.errors.push(e.message);
    }
    
    testResult.total = testResult.passed + testResult.failed;
    results.push(testResult);
  }
  
  return results;
}
