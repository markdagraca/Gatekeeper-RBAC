/**
 * This test specifically covers the React fallback case in the actual source code
 */

describe('React fallback coverage', () => {
  it('should trigger the React fallback path by mocking require failure', () => {
    // Mock console.log to avoid noise
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Store the original require.cache
    const originalCache = { ...require.cache };
    
    try {
      // Clear the module from cache
      const modulePath = require.resolve('../index');
      delete require.cache[modulePath];
      
      // Mock require to fail for 'react'
      const Module = require('module');
      const originalRequire = Module.prototype.require;
      
      Module.prototype.require = function(id: string) {
        if (id === 'react') {
          throw new Error('Mock: React module not found');
        }
        return originalRequire.apply(this, arguments);
      };
      
      // Now require the module - this should trigger the fallback path
      const nextauthModule = require('../index');
      
      // The module should still work even with React fallback
      expect(nextauthModule).toBeDefined();
      expect(typeof nextauthModule.createGatekeeperCallbacks).toBe('function');
      
      // Restore require
      Module.prototype.require = originalRequire;
      
    } finally {
      // Restore require.cache
      Object.keys(require.cache).forEach(key => {
        delete require.cache[key];
      });
      Object.assign(require.cache, originalCache);
      
      consoleErrorSpy.mockRestore();
    }
  });
});