/**
 * CommonJS Require Examples - Demonstrates working require patterns
 * 
 * These examples show how to properly require and use gatekeeper-rbac
 * in CommonJS environments after the v1.2.3 fixes.
 */

// ✅ WORKING: Destructuring assignment from require
const { Gatekeeper, RBAC, createGatekeeper } = require('gatekeeper-rbac');

// ✅ WORKING: Default require with property access
const GatekeeperLib = require('gatekeeper-rbac');

// ✅ WORKING: Direct default export access
const defaultExport = require('gatekeeper-rbac').default;

// Example usage with mock connector
const mockConnector = {
  // Mock implementation would go here
  // For demo purposes, this is just a placeholder
};

// Usage Pattern 1: Destructured Gatekeeper class
const gatekeeper1 = new Gatekeeper({ connector: mockConnector });

// Usage Pattern 2: Destructured RBAC class
const rbac1 = new RBAC({ connector: mockConnector });

// Usage Pattern 3: Destructured factory function
const rbac2 = createGatekeeper({ connector: mockConnector });

// Usage Pattern 4: Property access from default export
const gatekeeper2 = new defaultExport.Gatekeeper({ connector: mockConnector });
const rbac3 = new defaultExport.RBAC({ connector: mockConnector });
const rbac4 = defaultExport.createGatekeeper({ connector: mockConnector });

// Usage Pattern 5: Direct property access (CommonJS style)
const gatekeeper3 = new GatekeeperLib.default.Gatekeeper({ connector: mockConnector });
const rbac5 = new GatekeeperLib.default.RBAC({ connector: mockConnector });

console.log('All CommonJS require patterns work correctly!');
console.log('Gatekeeper === RBAC:', Gatekeeper === RBAC); // true
console.log('All instances are RBAC instances:', [
  gatekeeper1 instanceof RBAC,
  rbac1 instanceof RBAC,
  rbac2 instanceof RBAC,
  gatekeeper2 instanceof RBAC,
  rbac3 instanceof RBAC,
  rbac4 instanceof RBAC,
  gatekeeper3 instanceof RBAC,
  rbac5 instanceof RBAC
]); // All true

module.exports = {
  gatekeeper1,
  rbac1,
  rbac2,
  gatekeeper2,
  rbac3,
  rbac4,
  gatekeeper3,
  rbac5
}; 