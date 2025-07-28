/**
 * ESM/CJS Compatibility Tests
 * Verifies that imports work correctly in both module systems
 */

import { RBAC, Gatekeeper, createGatekeeper } from '../index';
import defaultExport from '../index';

describe('ESM/CJS Compatibility', () => {
  const mockConnector = {
    createRole: jest.fn(),
    getRoles: jest.fn(),
    updateRole: jest.fn(),
    deleteRole: jest.fn(),
    createGroup: jest.fn(),
    getGroups: jest.fn(),
    updateGroup: jest.fn(),
    deleteGroup: jest.fn(),
    createUser: jest.fn(),
    getUser: jest.fn(),
    getUsers: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserRoles: jest.fn(),
    assignUserRole: jest.fn(),
    revokeUserRole: jest.fn(),
    getUserGroups: jest.fn(),
    addUserToGroup: jest.fn(),
    removeUserFromGroup: jest.fn(),
    getUserPermissions: jest.fn(),
    grantUserPermission: jest.fn(),
    revokeUserPermission: jest.fn(),
    getUserEffectivePermissions: jest.fn(),
    createUserAssignment: jest.fn(),
    getUserAssignment: jest.fn(),
    updateUserAssignment: jest.fn(),
    deleteUserAssignment: jest.fn(),
    createPermissionTemplate: jest.fn(),
    getPermissionTemplates: jest.fn(),
    updatePermissionTemplate: jest.fn(),
    deletePermissionTemplate: jest.fn()
  };

  it('should allow named import of RBAC class', () => {
    expect(RBAC).toBeDefined();
    expect(typeof RBAC).toBe('function');
    
    const rbac = new RBAC({ connector: mockConnector as any });
    expect(rbac).toBeInstanceOf(RBAC);
  });

  it('should allow named import of Gatekeeper class (alias)', () => {
    expect(Gatekeeper).toBeDefined();
    expect(typeof Gatekeeper).toBe('function');
    expect(Gatekeeper).toBe(RBAC); // Should be the same constructor
    
    const gatekeeper = new Gatekeeper({ connector: mockConnector as any });
    expect(gatekeeper).toBeInstanceOf(RBAC);
    expect(gatekeeper).toBeInstanceOf(Gatekeeper);
  });

  it('should allow factory function import', () => {
    expect(createGatekeeper).toBeDefined();
    expect(typeof createGatekeeper).toBe('function');
    
    const rbac = createGatekeeper({ connector: mockConnector as any });
    expect(rbac).toBeInstanceOf(RBAC);
  });

  it('should allow default import with Gatekeeper alias', () => {
    expect(defaultExport).toBeDefined();
    expect(defaultExport.Gatekeeper).toBeDefined();
    expect(defaultExport.Gatekeeper).toBe(RBAC);
    
    const gatekeeper = new defaultExport.Gatekeeper({ connector: mockConnector as any });
    expect(gatekeeper).toBeInstanceOf(RBAC);
  });

  it('should allow default import with RBAC', () => {
    expect(defaultExport.RBAC).toBeDefined();
    expect(defaultExport.RBAC).toBe(RBAC);
    
    const rbac = new defaultExport.RBAC({ connector: mockConnector as any });
    expect(rbac).toBeInstanceOf(RBAC);
  });

  it('should allow default import with createGatekeeper', () => {
    expect(defaultExport.createGatekeeper).toBeDefined();
    expect(defaultExport.createGatekeeper).toBe(createGatekeeper);
    
    const rbac = defaultExport.createGatekeeper({ connector: mockConnector as any });
    expect(rbac).toBeInstanceOf(RBAC);
  });

  it('should demonstrate the expected user import patterns work', () => {
    // Pattern 1: Named import (what users were trying to do)
    const config = { connector: mockConnector as any };
    const gk1 = new Gatekeeper(config);
    expect(gk1).toBeInstanceOf(RBAC);

    // Pattern 2: Default import with property access
    const gk2 = new defaultExport.Gatekeeper(config);
    expect(gk2).toBeInstanceOf(RBAC);

    // Pattern 3: Factory function
    const gk3 = createGatekeeper(config);
    expect(gk3).toBeInstanceOf(RBAC);

    // All should be instances of the same class
    expect(gk1.constructor).toBe(gk2.constructor);
    expect(gk2.constructor).toBe(gk3.constructor);
  });
}); 