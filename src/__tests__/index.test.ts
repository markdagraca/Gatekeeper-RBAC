/**
 * Tests for the main index file exports
 */

import {
  RBAC,
  PermissionEngine,
  FirebaseConnector,
  createFirebaseConnector,
  createGatekeeperCallbacks,
  createTemplateManager,
  createPermissionTemplate,
  createGatekeeper,
  version,
  info,
  commonPermissions,
  roleTemplates,
  groupTemplates,
  permissionUtils,
  utils,
  // NextAuth integration exports
  withPermission,
  useGatekeeperPermissions,
  checkServerPermission,
  createPermissionMiddleware,
  withRBAC,
  syncUserWithGatekeeper,
  createNextjsMiddleware,
  getServerPermissions,
  getServerSidePermissions,
  withPermissions,
  requireAuth,
  // Template exports
  PermissionTemplateBuilder,
  TemplateManager,
  // Utility exports
  groupUtils,
  validationUtils,
  queryUtils,
  cacheUtils,
  migrationUtils,
  debugUtils,
} from '../index';

// Type-only imports for compilation testing
import type { GatekeeperNextAuthConfig } from '../index';

// Test default export
import defaultExport from '../index';

// Mock dependencies
const mockConnector = {
  getUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getGroup: jest.fn(),
  createGroup: jest.fn(),
  updateGroup: jest.fn(),
  deleteGroup: jest.fn(),
  getGroupsByUserId: jest.fn(),
  getRole: jest.fn(),
  createRole: jest.fn(),
  updateRole: jest.fn(),
  deleteRole: jest.fn(),
  getUserAssignment: jest.fn(),
  createUserAssignment: jest.fn(),
  updateUserAssignment: jest.fn(),
  deleteUserAssignment: jest.fn(),
  getTemplate: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  listTemplates: jest.fn()
};

describe('Index Exports', () => {
  it('should export core classes', () => {
    expect(RBAC).toBeDefined();
    expect(PermissionEngine).toBeDefined();
    expect(FirebaseConnector).toBeDefined();
  });

  it('should export factory functions', () => {
    expect(typeof createGatekeeper).toBe('function');
    expect(typeof createFirebaseConnector).toBe('function');
    expect(typeof createGatekeeperCallbacks).toBe('function');
    expect(typeof createTemplateManager).toBe('function');
    expect(typeof createPermissionTemplate).toBe('function');
  });

  it('should export templates', () => {
    expect(commonPermissions).toBeDefined();
    expect(roleTemplates).toBeDefined();
    expect(groupTemplates).toBeDefined();
  });

  it('should export utilities', () => {
    expect(permissionUtils).toBeDefined();
    expect(utils).toBeDefined();
  });

  it('should export version and info', () => {
    expect(version).toBe('1.2.3');
    expect(info).toEqual({
      name: 'gatekeeper-rbac',
      version: '1.2.3',
      description: 'A flexible, granular role-based access control library for TypeScript with NextAuth integration',
      author: 'Gatekeeper Contributors',
      license: 'MIT'
    });
  });

  it('should create gatekeeper instance', () => {
    const rbac = createGatekeeper({
      connector: mockConnector as any
    });

    expect(rbac).toBeInstanceOf(RBAC);
  });

  it('should create firebase connector', () => {
    const mockFirestore = {} as any;
    const connector = createFirebaseConnector(mockFirestore);

    expect(connector).toBeInstanceOf(FirebaseConnector);
  });

  it('should create template manager', () => {
    const manager = createTemplateManager(mockConnector as any);
    expect(manager).toBeDefined();
  });

  it('should create permission template', () => {
    const builder = createPermissionTemplate('test', 'Test Template');
    expect(builder).toBeDefined();
  });

  it('should create gatekeeper callbacks', () => {
    const rbac = createGatekeeper({ connector: mockConnector as any });
    const callbacks = createGatekeeperCallbacks({ rbac });
    
    expect(callbacks).toHaveProperty('jwt');
    expect(callbacks).toHaveProperty('session');
  });

  describe('NextAuth Integration Exports', () => {
    it('should export NextAuth functions', () => {
      expect(typeof withPermission).toBe('function');
      expect(typeof useGatekeeperPermissions).toBe('function');
      expect(typeof checkServerPermission).toBe('function');
      expect(typeof createPermissionMiddleware).toBe('function');
      expect(typeof withRBAC).toBe('function');
      expect(typeof syncUserWithGatekeeper).toBe('function');
      expect(typeof createNextjsMiddleware).toBe('function');
      expect(typeof getServerPermissions).toBe('function');
      expect(typeof getServerSidePermissions).toBe('function');
      expect(typeof withPermissions).toBe('function');
      expect(typeof requireAuth).toBe('function');
    });

    it('should export NextAuth types', () => {
      // Test that types can be used (compilation test)
      const config: GatekeeperNextAuthConfig = {
        rbac: createGatekeeper({ connector: mockConnector as any })
      };
      
      expect(config).toBeDefined();
      expect(config.rbac).toBeInstanceOf(RBAC);
    });
  });

  describe('Template Exports', () => {
    it('should export template classes', () => {
      expect(PermissionTemplateBuilder).toBeDefined();
      expect(TemplateManager).toBeDefined();
    });

    it('should export template objects', () => {
      expect(commonPermissions).toBeDefined();
      expect(roleTemplates).toBeDefined();
      expect(groupTemplates).toBeDefined();
    });
  });

  describe('Utility Exports', () => {
    it('should export all utility modules', () => {
      expect(permissionUtils).toBeDefined();
      expect(groupUtils).toBeDefined();
      expect(validationUtils).toBeDefined();
      expect(queryUtils).toBeDefined();
      expect(cacheUtils).toBeDefined();
      expect(migrationUtils).toBeDefined();
      expect(debugUtils).toBeDefined();
      expect(utils).toBeDefined();
    });

    it('should have utility functions', () => {
      // Test that utils contain expected properties/functions
      expect(typeof utils).toBe('object');
      expect(typeof permissionUtils).toBe('object');
      expect(typeof groupUtils).toBe('object');
      expect(typeof validationUtils).toBe('object');
      expect(typeof queryUtils).toBe('object');
      expect(typeof cacheUtils).toBe('object');
      expect(typeof migrationUtils).toBe('object');
      expect(typeof debugUtils).toBe('object');
    });
  });

  describe('Default Export', () => {
    it('should export default object with core functions', () => {
      expect(defaultExport).toBeDefined();
      expect(defaultExport.RBAC).toBe(RBAC);
      expect(defaultExport.PermissionEngine).toBe(PermissionEngine);
      expect(defaultExport.FirebaseConnector).toBe(FirebaseConnector);
      expect(defaultExport.createGatekeeper).toBe(createGatekeeper);
      expect(defaultExport.createFirebaseConnector).toBe(createFirebaseConnector);
      expect(defaultExport.createGatekeeperCallbacks).toBe(createGatekeeperCallbacks);
      expect(defaultExport.createTemplateManager).toBe(createTemplateManager);
      expect(defaultExport.version).toBe(version);
      expect(defaultExport.info).toBe(info);
    });
  });

  describe('Integration Test - All Exports Working Together', () => {
    it('should create a complete RBAC system with all components', async () => {
      // Create RBAC instance
      const rbac = createGatekeeper({ connector: mockConnector as any });
      
      // Create NextAuth callbacks
      const callbacks = createGatekeeperCallbacks({ rbac });
      
      // Create template manager
      const templateManager = createTemplateManager(mockConnector as any);
      
      // Create permission template
      const template = createPermissionTemplate('admin', 'Admin Template');
      
      // Verify all components are properly instantiated
      expect(rbac).toBeInstanceOf(RBAC);
      expect(callbacks).toHaveProperty('jwt');
      expect(callbacks).toHaveProperty('session');
      expect(templateManager).toBeDefined();
      expect(template).toBeDefined();
    });

    it('should have consistent version across exports', () => {
      expect(version).toBe('1.2.3');
      expect(info.version).toBe('1.2.3');
      expect(defaultExport.version).toBe('1.2.3');
      expect(defaultExport.info.version).toBe('1.2.3');
    });
  });
});