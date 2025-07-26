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
  utils
} from '../index';

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
    expect(version).toBe('1.0.0');
    expect(info).toEqual({
      name: 'gatekeeper-rbac',
      version: '1.0.0',
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
});