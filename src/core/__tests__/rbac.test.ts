import { RBAC } from '../rbac';
import { PermissionEngine } from '../permission-engine';
import { 
  RBACConfig, 
  DatabaseConnector, 
  User, 
  Role, 
  Group, 
  UserAssignment,
  ConditionalPermission 
} from '../types';

// Mock the permission engine
jest.mock('../permission-engine');

describe('RBAC', () => {
  let rbac: RBAC;
  let mockConnector: jest.Mocked<DatabaseConnector>;
  let mockEngine: jest.Mocked<PermissionEngine>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockRole: Role = {
    id: 'role-123',
    name: 'Test Role',
    permissions: [{ permission: 'users.read' }],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockGroup: Group = {
    id: 'group-123',
    name: 'Test Group',
    members: ['user-123'],
    permissions: [{ permission: 'groups.read' }],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAssignment: UserAssignment = {
    userId: 'user-123',
    roleIds: ['role-123'],
    groupIds: ['group-123'],
    directPermissions: [{ permission: 'direct.permission' }],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Create mock connector
    mockConnector = {
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

    const config: RBACConfig = {
      connector: mockConnector,
      cacheEnabled: true,
      cacheTTL: 300
    };

    rbac = new RBAC(config);

    // Get the mocked engine instance
    mockEngine = (rbac as any).engine as jest.Mocked<PermissionEngine>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    beforeEach(() => {
      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);
      mockConnector.getRole.mockResolvedValue(mockRole);
      mockConnector.getGroup.mockResolvedValue(mockGroup);
      mockEngine.normalizePermission.mockImplementation(p => p.toLowerCase());
      mockEngine.evaluatePermissions.mockReturnValue({
        allowed: true,
        matchedPermissions: [{ permission: 'users.read' }]
      });
    });

    it('should check user permission successfully', async () => {
      const result = await rbac.hasPermission('user-123', 'users.read');

      expect(result.allowed).toBe(true);
      expect(mockConnector.getUserAssignment).toHaveBeenCalledWith('user-123');
      expect(mockEngine.evaluatePermissions).toHaveBeenCalled();
    });

    it('should handle user with no assignment', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(null);

      const result = await rbac.hasPermission('user-123', 'users.read');

      expect(mockEngine.evaluatePermissions).toHaveBeenCalledWith(
        'users.read',
        [],
        expect.any(Object)
      );
    });

    it('should include context in permission check', async () => {
      const context = { resource: 'document-123' };

      await rbac.hasPermission('user-123', 'users.read', context);

      expect(mockEngine.evaluatePermissions).toHaveBeenCalledWith(
        'users.read',
        expect.any(Array),
        expect.objectContaining({
          userId: 'user-123',
          resource: 'document-123'
        })
      );
    });
  });

  describe('hasPermissions', () => {
    beforeEach(() => {
      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);
      mockConnector.getRole.mockResolvedValue(mockRole);
      mockConnector.getGroup.mockResolvedValue(mockGroup);
      mockEngine.normalizePermission.mockImplementation(p => p.toLowerCase());
      mockEngine.evaluatePermissions.mockReturnValue({
        allowed: true,
        matchedPermissions: [{ permission: 'users.read' }]
      });
    });

    it('should check multiple permissions', async () => {
      const permissions = ['users.read', 'users.write'];
      const results = await rbac.hasPermissions('user-123', permissions);

      expect(Object.keys(results)).toEqual(permissions);
      expect(results['users.read'].allowed).toBe(true);
      expect(results['users.write'].allowed).toBe(true);
      expect(mockConnector.getUserAssignment).toHaveBeenCalledTimes(1); // Should cache
    });
  });

  describe('getUserEffectivePermissions', () => {
    it('should return cached permissions', async () => {
      const cachedPermissions = [{ permission: 'cached.permission' }];
      (rbac as any).setCache('user_permissions:user-123', cachedPermissions);

      const result = await rbac.getUserEffectivePermissions('user-123');

      expect(result).toEqual(cachedPermissions);
      expect(mockConnector.getUserAssignment).not.toHaveBeenCalled();
    });

    it('should aggregate permissions from all sources', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);
      mockConnector.getRole.mockResolvedValue(mockRole);
      mockConnector.getGroup.mockResolvedValue(mockGroup);

      const result = await rbac.getUserEffectivePermissions('user-123');

      expect(result).toEqual(expect.arrayContaining([
        { permission: 'direct.permission' }, // Direct permissions
        { permission: 'users.read' }, // Role permissions
        { permission: 'groups.read' } // Group permissions
      ]));
    });

    it('should handle nested groups', async () => {
      const nestedGroup: Group = {
        id: 'nested-group',
        name: 'Nested Group',
        members: [mockGroup], // Contains the main group
        permissions: [{ permission: 'nested.permission' }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const assignmentWithNestedGroup: UserAssignment = {
        ...mockAssignment,
        groupIds: ['nested-group']
      };

      mockConnector.getUserAssignment.mockResolvedValue(assignmentWithNestedGroup);
      mockConnector.getGroup
        .mockResolvedValueOnce(nestedGroup)
        .mockResolvedValueOnce(mockGroup);

      const result = await rbac.getUserEffectivePermissions('user-123');

      expect(result).toEqual(expect.arrayContaining([
        { permission: 'nested.permission' },
        { permission: 'groups.read' }
      ]));
    });

    it('should handle circular group references', async () => {
      const circularGroup1: Group = {
        id: 'circular-1',
        name: 'Circular Group 1',
        members: [], // Will be set to reference circular-2
        permissions: [{ permission: 'circular1.permission' }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const circularGroup2: Group = {
        id: 'circular-2',
        name: 'Circular Group 2',
        members: [circularGroup1], // References circular-1
        permissions: [{ permission: 'circular2.permission' }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      circularGroup1.members = [circularGroup2];

      const assignmentWithCircular: UserAssignment = {
        ...mockAssignment,
        groupIds: ['circular-1']
      };

      mockConnector.getUserAssignment.mockResolvedValue(assignmentWithCircular);
      mockConnector.getGroup
        .mockImplementation((id) => {
          if (id === 'circular-1') return Promise.resolve(circularGroup1);
          if (id === 'circular-2') return Promise.resolve(circularGroup2);
          return Promise.resolve(null);
        });

      const result = await rbac.getUserEffectivePermissions('user-123');

      // Should not infinite loop and should include both permissions
      expect(result).toEqual(expect.arrayContaining([
        { permission: 'circular1.permission' },
        { permission: 'circular2.permission' }
      ]));
    });
  });

  describe('role management', () => {
    it('should assign role to user', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(null);
      mockConnector.createUserAssignment.mockResolvedValue(mockAssignment);

      await rbac.assignRole('user-123', 'role-123');

      expect(mockConnector.createUserAssignment).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: ['role-123'],
        groupIds: []
      });
    });

    it('should not assign duplicate role', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);

      await rbac.assignRole('user-123', 'role-123');

      expect(mockConnector.updateUserAssignment).not.toHaveBeenCalled();
    });

    it('should add role to existing assignment', async () => {
      const existingAssignment = { ...mockAssignment, roleIds: ['existing-role'] };
      mockConnector.getUserAssignment.mockResolvedValue(existingAssignment);

      await rbac.assignRole('user-123', 'new-role');

      expect(mockConnector.updateUserAssignment).toHaveBeenCalledWith('user-123', {
        roleIds: ['existing-role', 'new-role']
      });
    });

    it('should unassign role from user', async () => {
      const assignmentWithMultipleRoles = {
        ...mockAssignment,
        roleIds: ['role-123', 'role-456']
      };
      mockConnector.getUserAssignment.mockResolvedValue(assignmentWithMultipleRoles);

      await rbac.unassignRole('user-123', 'role-123');

      expect(mockConnector.updateUserAssignment).toHaveBeenCalledWith('user-123', {
        roleIds: ['role-456']
      });
    });

    it('should handle unassigning role from user with no assignment', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(null);

      await rbac.unassignRole('user-123', 'role-123');

      expect(mockConnector.updateUserAssignment).not.toHaveBeenCalled();
    });
  });

  describe('group management', () => {
    it('should add user to group', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(null);
      mockConnector.createUserAssignment.mockResolvedValue(mockAssignment);

      await rbac.addUserToGroup('user-123', 'group-123');

      expect(mockConnector.createUserAssignment).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: [],
        groupIds: ['group-123']
      });
    });

    it('should remove user from group', async () => {
      const assignmentWithMultipleGroups = {
        ...mockAssignment,
        groupIds: ['group-123', 'group-456']
      };
      mockConnector.getUserAssignment.mockResolvedValue(assignmentWithMultipleGroups);

      await rbac.removeUserFromGroup('user-123', 'group-123');

      expect(mockConnector.updateUserAssignment).toHaveBeenCalledWith('user-123', {
        groupIds: ['group-456']
      });
    });
  });

  describe('direct permissions', () => {
    it('should grant direct permission to user', async () => {
      const permission: ConditionalPermission = { permission: 'special.permission' };
      mockConnector.getUserAssignment.mockResolvedValue(null);
      mockConnector.createUserAssignment.mockResolvedValue(mockAssignment);

      await rbac.grantPermission('user-123', permission);

      expect(mockConnector.createUserAssignment).toHaveBeenCalledWith({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        directPermissions: [permission]
      });
    });

    it('should add permission to existing direct permissions', async () => {
      const newPermission: ConditionalPermission = { permission: 'new.permission' };
      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);

      await rbac.grantPermission('user-123', newPermission);

      expect(mockConnector.updateUserAssignment).toHaveBeenCalledWith('user-123', {
        directPermissions: [
          { permission: 'direct.permission' },
          newPermission
        ]
      });
    });

    it('should revoke direct permission from user', async () => {
      const assignmentWithOnlyDirectPermission = {
        ...mockAssignment,
        directPermissions: [{ permission: 'direct.permission' }]
      };
      mockConnector.getUserAssignment.mockResolvedValue(assignmentWithOnlyDirectPermission);
      
      await rbac.revokePermission('user-123', 'direct.permission');

      expect(mockConnector.updateUserAssignment).toHaveBeenCalledWith('user-123', {
        directPermissions: []
      });
    });

    it('should handle revoking permission from user with no direct permissions', async () => {
      const assignmentWithoutDirectPermissions = {
        ...mockAssignment,
        directPermissions: undefined
      };
      mockConnector.getUserAssignment.mockResolvedValue(assignmentWithoutDirectPermissions);

      await rbac.revokePermission('user-123', 'some.permission');

      expect(mockConnector.updateUserAssignment).not.toHaveBeenCalled();
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);
      mockConnector.getRole.mockResolvedValue(mockRole);

      const roles = await rbac.getUserRoles('user-123');

      expect(roles).toEqual([mockRole]);
      expect(mockConnector.getRole).toHaveBeenCalledWith('role-123');
    });

    it('should return empty array for user with no assignment', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(null);

      const roles = await rbac.getUserRoles('user-123');

      expect(roles).toEqual([]);
    });

    it('should filter out non-existent roles', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);
      mockConnector.getRole.mockResolvedValue(null);

      const roles = await rbac.getUserRoles('user-123');

      expect(roles).toEqual([]);
    });
  });

  describe('getUserGroups', () => {
    it('should return user groups including nested ones', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);
      mockConnector.getGroup.mockResolvedValue(mockGroup);

      const groups = await rbac.getUserGroups('user-123');

      expect(groups).toEqual([mockGroup]);
    });

    it('should return empty array for user with no assignment', async () => {
      mockConnector.getUserAssignment.mockResolvedValue(null);

      const groups = await rbac.getUserGroups('user-123');

      expect(groups).toEqual([]);
    });
  });

  describe('cache management', () => {
    it('should clear user cache when role assigned', async () => {
      const clearUserCacheSpy = jest.spyOn(rbac as any, 'clearUserCache');
      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);

      await rbac.assignRole('user-123', 'new-role');

      expect(clearUserCacheSpy).toHaveBeenCalledWith('user-123');
    });

    it('should clear all cache', () => {
      (rbac as any).setCache('test-key', 'test-value');
      
      rbac.clearCache();

      const cached = (rbac as any).getFromCache('test-key');
      expect(cached).toBeNull();
    });

    it('should handle cache expiration', () => {
      const shortTTLConfig: RBACConfig = {
        connector: mockConnector,
        cacheEnabled: true,
        cacheTTL: 0.001 // Very short TTL
      };
      const shortTTLRbac = new RBAC(shortTTLConfig);

      (shortTTLRbac as any).setCache('test-key', 'test-value');

      // Wait for cache to expire
      setTimeout(() => {
        const cached = (shortTTLRbac as any).getFromCache('test-key');
        expect(cached).toBeNull();
      }, 10);
    });

    it('should not use cache when disabled', async () => {
      const noCacheConfig: RBACConfig = {
        connector: mockConnector,
        cacheEnabled: false
      };
      const noCacheRbac = new RBAC(noCacheConfig);

      mockConnector.getUserAssignment.mockResolvedValue(mockAssignment);

      // Call twice to see if cache is used
      await noCacheRbac.getUserEffectivePermissions('user-123');
      await noCacheRbac.getUserEffectivePermissions('user-123');

      expect(mockConnector.getUserAssignment).toHaveBeenCalledTimes(2);
    });
  });
});