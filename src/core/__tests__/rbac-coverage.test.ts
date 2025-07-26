/**
 * Additional RBAC tests to achieve 100% coverage
 */

import { RBAC } from '../rbac';
import { DatabaseConnector, RBACConfig } from '../types';

describe('RBAC - Coverage Tests', () => {
  let rbac: RBAC;
  let mockConnector: jest.Mocked<DatabaseConnector>;

  beforeEach(() => {
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
  });

  it('should handle getGroupPermissions with no groups found', async () => {
    const assignment = {
      userId: 'user-123',
      roleIds: [],
      groupIds: ['non-existent-group'],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockConnector.getUserAssignment.mockResolvedValue(assignment);
    mockConnector.getGroup.mockResolvedValue(null);

    const permissions = await rbac.getUserEffectivePermissions('user-123');
    expect(permissions).toEqual([]);
  });

  it('should handle getUserRoles with no roles found', async () => {
    const assignment = {
      userId: 'user-123',
      roleIds: ['non-existent-role'],
      groupIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockConnector.getUserAssignment.mockResolvedValue(assignment);
    mockConnector.getRole.mockResolvedValue(null);

    const roles = await rbac.getUserRoles('user-123');
    expect(roles).toEqual([]);
  });

  it('should handle getUserGroups with no groups found', async () => {
    const assignment = {
      userId: 'user-123',
      roleIds: [],
      groupIds: ['non-existent-group'],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockConnector.getUserAssignment.mockResolvedValue(assignment);
    mockConnector.getGroup.mockResolvedValue(null);

    const groups = await rbac.getUserGroups('user-123');
    expect(groups).toEqual([]);
  });

  it('should handle cache TTL edge case', () => {
    const shortTTLConfig: RBACConfig = {
      connector: mockConnector,
      cacheEnabled: true,
      cacheTTL: 0.001 // Very short TTL
    };
    const shortTTLRbac = new RBAC(shortTTLConfig);

    // Test the private cache methods by accessing them
    (shortTTLRbac as any).setCache('test-key', 'test-value');
    
    // Wait for expiration and test
    setTimeout(() => {
      const result = (shortTTLRbac as any).getFromCache('test-key');
      expect(result).toBeNull();
    }, 5);
  });

  it('should handle clearUserCache with specific pattern', async () => {
    // Set multiple cache entries
    (rbac as any).setCache('user_permissions:user-123', 'data1');
    (rbac as any).setCache('user_roles:user-123', 'data2');
    (rbac as any).setCache('other_cache:user-456', 'data3');

    // Clear cache for specific user
    (rbac as any).clearUserCache('user-123');

    // Check that only user-123 entries were cleared
    expect((rbac as any).getFromCache('user_permissions:user-123')).toBeNull();
    expect((rbac as any).getFromCache('other_cache:user-456')).toBe('data3');
  });

  describe('getUserGroups circular reference handling', () => {
    it('should handle circular references in nested groups - line 213', async () => {
      const userId = 'user-123';
      const assignment = {
        userId,
        roleIds: [],
        groupIds: ['group-a', 'group-a'], // Duplicate group ID to trigger circular reference check
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const groupA = {
        id: 'group-a',
        name: 'Group A',
        members: ['user-1'],
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockConnector.getUserAssignment.mockResolvedValue(assignment);
      mockConnector.getGroup.mockResolvedValue(groupA);

      const result = await rbac.getUserGroups(userId);

      // Should return only one group despite duplicate IDs
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('group-a');
      
      // getGroup should only be called once due to circular reference detection (line 213)
      expect(mockConnector.getGroup).toHaveBeenCalledTimes(1);
    });

    it('should handle nested group members that are objects - line 227', async () => {
      const userId = 'user-123';
      const assignment = {
        userId,
        roleIds: [],
        groupIds: ['parent-group'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const nestedGroup = {
        id: 'nested-group',
        name: 'Nested Group',
        members: ['user-nested'],
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const anotherNested = {
        id: 'another-nested',
        name: 'Another Nested',
        members: [],
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const parentGroup = {
        id: 'parent-group',
        name: 'Parent Group',
        members: [
          'user-direct',
          nestedGroup, // This should trigger line 227
          anotherNested
        ],
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockConnector.getUserAssignment.mockResolvedValue(assignment);
      mockConnector.getGroup
        .mockResolvedValueOnce(parentGroup)
        .mockResolvedValueOnce(nestedGroup)
        .mockResolvedValueOnce(anotherNested);

      const result = await rbac.getUserGroups(userId);

      expect(result).toHaveLength(3);
      expect(result.map(g => g.id)).toContain('parent-group');
      expect(result.map(g => g.id)).toContain('nested-group');
      expect(result.map(g => g.id)).toContain('another-nested');
      
      // Verify the nested group processing was called (line 227)
      expect(mockConnector.getGroup).toHaveBeenCalledWith('nested-group');
      expect(mockConnector.getGroup).toHaveBeenCalledWith('another-nested');
    });
  });

  describe('removeUserFromGroup early return - line 311', () => {
    it('should return early when user assignment does not exist - line 311', async () => {
      const userId = 'non-existent-user';
      const groupId = 'some-group';

      // Mock no assignment found
      mockConnector.getUserAssignment.mockResolvedValue(null);

      await rbac.removeUserFromGroup(userId, groupId);

      // Should return early without calling updateUserAssignment
      expect(mockConnector.getUserAssignment).toHaveBeenCalledWith(userId);
      expect(mockConnector.updateUserAssignment).not.toHaveBeenCalled();
    });
  });

  describe('Cache expiration handling - lines 376-377', () => {
    it('should handle expired cache entries - lines 376-377', async () => {
      const userId = 'user-123';
      const assignment = {
        userId,
        roleIds: [],
        groupIds: [],
        directPermissions: [{ permission: 'test.permission' }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockConnector.getUserAssignment.mockResolvedValue(assignment);

      // Get permissions first time (should cache)
      await rbac.getUserEffectivePermissions(userId);

      // Access the private cache and manually set an expired entry
      const cache = (rbac as any).cache;
      const cacheKey = `user_permissions:${userId}`;
      
      // Set an expired cache entry
      cache.set(cacheKey, {
        data: [{ permission: 'old.permission' }],
        expires: Date.now() - 1000 // Expired 1 second ago
      });

      // Get permissions again - should detect expiration and fetch fresh data
      const result = await rbac.getUserEffectivePermissions(userId);

      // Should have fetched fresh data, not the expired cached data
      expect(result).toEqual([{ permission: 'test.permission' }]);
      expect(mockConnector.getUserAssignment).toHaveBeenCalledTimes(2);
      
      // Verify the expired entry was removed (line 376-377)
      expect(cache.has(cacheKey)).toBe(true); // New entry should be cached
      const newCacheEntry = cache.get(cacheKey);
      expect(newCacheEntry.data).toEqual([{ permission: 'test.permission' }]);
    });
  });
});