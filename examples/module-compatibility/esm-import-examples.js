/**
 * ESM Import Examples - Demonstrates working import patterns
 * 
 * These examples show how to properly import and use gatekeeper-rbac
 * after the v1.2.3 fixes for ESM/CJS compatibility.
 */

// ✅ WORKING: Named import of Gatekeeper class
import { Gatekeeper } from 'gatekeeper-rbac';

// ✅ WORKING: Named import of RBAC class (original name)
import { RBAC } from 'gatekeeper-rbac';

// ✅ WORKING: Named import of factory function
import { createGatekeeper } from 'gatekeeper-rbac';

// ✅ WORKING: Named import of other utilities
import { FirebaseConnector, createFirebaseConnector } from 'gatekeeper-rbac';

// ✅ WORKING: Default import for accessing all exports
import GatekeeperLib from 'gatekeeper-rbac';

// Example usage with mock connector
const mockConnector = {
  // Mock implementation would go here
  // For demo purposes, this is just a placeholder
};

// Usage Pattern 1: Direct class instantiation (what users expected)
const gatekeeper1 = new Gatekeeper({ connector: mockConnector });

// Usage Pattern 2: Original class name still works
const rbac1 = new RBAC({ connector: mockConnector });

// Usage Pattern 3: Factory function approach
const rbac2 = createGatekeeper({ connector: mockConnector });

// Usage Pattern 4: Default import with property access
const gatekeeper2 = new GatekeeperLib.Gatekeeper({ connector: mockConnector });
const rbac3 = new GatekeeperLib.RBAC({ connector: mockConnector });
const rbac4 = GatekeeperLib.createGatekeeper({ connector: mockConnector });

console.log('All import patterns work correctly!');
console.log('Gatekeeper === RBAC:', Gatekeeper === RBAC); // true
console.log('All instances are RBAC instances:', [
  gatekeeper1 instanceof RBAC,
  rbac1 instanceof RBAC,
  rbac2 instanceof RBAC,
  gatekeeper2 instanceof RBAC,
  rbac3 instanceof RBAC,
  rbac4 instanceof RBAC
]); // All true

export {
  gatekeeper1,
  rbac1,
  rbac2,
  gatekeeper2,
  rbac3,
  rbac4
}; 