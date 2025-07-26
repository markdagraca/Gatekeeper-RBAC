import {
  permissionUtils,
  groupUtils,
  validationUtils,
  queryUtils,
  cacheUtils,
  migrationUtils,
  debugUtils,
  utils
} from '../index';
import { Group, Permission } from '../../core/types';

describe('Utils', () => {
  describe('permissionUtils', () => {
    describe('createPermission', () => {
      it('should create resource-action permission', () => {
        const permission = permissionUtils.createPermission('users', 'read');
        expect(permission).toBe('users.read');
      });

      it('should create resource-action-scope permission', () => {
        const permission = permissionUtils.createPermission('users', 'read', 'own');
        expect(permission).toBe('users.read.own');
      });
    });

    describe('parsePermission', () => {
      it('should parse three-part permission', () => {
        const result = permissionUtils.parsePermission('service.resource.action');
        expect(result).toEqual({
          resource: 'service',
          action: 'resource',
          scope: 'action',
          parts: ['service', 'resource', 'action']
        });
      });

      it('should parse two-part permission', () => {
        const result = permissionUtils.parsePermission('resource.action');
        expect(result).toEqual({
          resource: 'resource',
          action: 'action',
          parts: ['resource', 'action']
        });
      });

      it('should parse single-part permission', () => {
        const result = permissionUtils.parsePermission('action');
        expect(result).toEqual({
          action: 'action',
          parts: ['action']
        });
      });

      it('should handle malformed permissions', () => {
        const result = permissionUtils.parsePermission('a.b.c.d.e');
        expect(result).toEqual({
          parts: ['a', 'b', 'c', 'd', 'e']
        });
      });
    });

    describe('matchesPattern', () => {
      it('should match universal wildcard', () => {
        expect(permissionUtils.matchesPattern('users.read', '*')).toBe(true);
        expect(permissionUtils.matchesPattern('anything', '*')).toBe(true);
      });

      it('should match exact permissions', () => {
        expect(permissionUtils.matchesPattern('users.read', 'users.read')).toBe(true);
        expect(permissionUtils.matchesPattern('users.read', 'users.write')).toBe(false);
      });

      it('should match resource wildcards', () => {
        expect(permissionUtils.matchesPattern('users.read', 'users.*')).toBe(true);
        expect(permissionUtils.matchesPattern('users.write', 'users.*')).toBe(true);
        expect(permissionUtils.matchesPattern('posts.read', 'users.*')).toBe(false);
      });

      it('should not match longer patterns', () => {
        expect(permissionUtils.matchesPattern('users', 'users.read')).toBe(false);
      });

      it('should handle partial wildcards', () => {
        expect(permissionUtils.matchesPattern('users.admin.read', 'users.*')).toBe(true);
        expect(permissionUtils.matchesPattern('users.admin', 'users.*')).toBe(true);
      });
    });

    describe('generateCRUDPermissions', () => {
      it('should generate standard CRUD permissions', () => {
        const permissions = permissionUtils.generateCRUDPermissions('users');
        expect(permissions).toEqual([
          'users.create',
          'users.read',
          'users.update',
          'users.delete',
          'users.list'
        ]);
      });
    });

    describe('createConditionalPermission', () => {
      it('should create basic conditional permission', () => {
        const permission = permissionUtils.createConditionalPermission('users.read');
        expect(permission).toEqual({ permission: 'users.read' });
      });

      it('should create owner-only permission', () => {
        const permission = permissionUtils.createConditionalPermission('users.read', {
          ownerOnly: true
        });
        expect(permission).toEqual({
          permission: 'users.read',
          conditions: [{
            attribute: 'userId',
            operator: 'equals',
            value: '${userId}'
          }]
        });
      });

      it('should create owner-only permission with custom attribute', () => {
        const permission = permissionUtils.createConditionalPermission('documents.read', {
          ownerOnly: true,
          userIdAttribute: 'document.ownerId'
        });
        expect(permission.conditions![0].attribute).toBe('document.ownerId');
      });

      it('should add custom conditions', () => {
        const customConditions = [{
          attribute: 'department',
          operator: 'equals' as const,
          value: 'engineering'
        }];

        const permission = permissionUtils.createConditionalPermission('users.read', {
          customConditions
        });
        expect(permission.conditions).toEqual(customConditions);
      });

      it('should combine owner-only and custom conditions', () => {
        const customConditions = [{
          attribute: 'department',
          operator: 'equals' as const,
          value: 'engineering'
        }];

        const permission = permissionUtils.createConditionalPermission('users.read', {
          ownerOnly: true,
          customConditions
        });
        expect(permission.conditions).toHaveLength(2);
      });
    });
  });

  describe('groupUtils', () => {
    const createTestGroup = (id: string, members: (string | Group)[]): Group => ({
      id,
      name: `Group ${id}`,
      members,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    describe('flattenGroupMembers', () => {
      it('should flatten simple user list', () => {
        const group = createTestGroup('group1', ['user1', 'user2', 'user3']);
        const userIds = groupUtils.flattenGroupMembers(group);
        expect(userIds).toEqual(['user1', 'user2', 'user3']);
      });

      it('should flatten nested groups', () => {
        const nestedGroup = createTestGroup('nested', ['user2', 'user3']);
        const group = createTestGroup('parent', ['user1', nestedGroup]);
        
        const userIds = groupUtils.flattenGroupMembers(group);
        expect(userIds).toEqual(['user1', 'user2', 'user3']);
      });

      it('should handle deep nesting', () => {
        const deepGroup = createTestGroup('deep', ['user4']);
        const nestedGroup = createTestGroup('nested', ['user2', 'user3', deepGroup]);
        const group = createTestGroup('parent', ['user1', nestedGroup]);
        
        const userIds = groupUtils.flattenGroupMembers(group);
        expect(userIds).toEqual(['user1', 'user2', 'user3', 'user4']);
      });

      it('should remove duplicate users', () => {
        const nestedGroup = createTestGroup('nested', ['user1', 'user2']);
        const group = createTestGroup('parent', ['user1', nestedGroup]);
        
        const userIds = groupUtils.flattenGroupMembers(group);
        expect(userIds).toEqual(['user1', 'user2']);
      });

      it('should handle empty groups', () => {
        const group = createTestGroup('empty', []);
        const userIds = groupUtils.flattenGroupMembers(group);
        expect(userIds).toEqual([]);
      });
    });

    describe('containsUser', () => {
      it('should find direct member', () => {
        const group = createTestGroup('group1', ['user1', 'user2']);
        expect(groupUtils.containsUser(group, 'user1')).toBe(true);
        expect(groupUtils.containsUser(group, 'user3')).toBe(false);
      });

      it('should find nested member', () => {
        const nestedGroup = createTestGroup('nested', ['user2']);
        const group = createTestGroup('parent', ['user1', nestedGroup]);
        
        expect(groupUtils.containsUser(group, 'user2')).toBe(true);
      });
    });

    describe('getGroupDepth', () => {
      it('should return 0 for flat group', () => {
        const group = createTestGroup('flat', ['user1', 'user2']);
        expect(groupUtils.getGroupDepth(group)).toBe(0);
      });

      it('should return 1 for one level nesting', () => {
        const nestedGroup = createTestGroup('nested', ['user2']);
        const group = createTestGroup('parent', ['user1', nestedGroup]);
        expect(groupUtils.getGroupDepth(group)).toBe(1);
      });

      it('should return correct depth for deep nesting', () => {
        const level3 = createTestGroup('level3', ['user3']);
        const level2 = createTestGroup('level2', ['user2', level3]);
        const level1 = createTestGroup('level1', ['user1', level2]);
        
        expect(groupUtils.getGroupDepth(level1)).toBe(2);
      });

      it('should handle multiple branches', () => {
        const branch1 = createTestGroup('branch1', ['user2']);
        const branch2deep = createTestGroup('deep', ['user4']);
        const branch2 = createTestGroup('branch2', ['user3', branch2deep]);
        const root = createTestGroup('root', ['user1', branch1, branch2]);
        
        expect(groupUtils.getGroupDepth(root)).toBe(2);
      });
    });
  });

  describe('validationUtils', () => {
    describe('isValidPermission', () => {
      it('should validate correct permissions', () => {
        expect(validationUtils.isValidPermission('users.read')).toBe(true);
        expect(validationUtils.isValidPermission('users.*')).toBe(true);
        expect(validationUtils.isValidPermission('service.resource_name.action-type')).toBe(true);
        expect(validationUtils.isValidPermission('*')).toBe(true);
      });

      it('should reject invalid permissions', () => {
        expect(validationUtils.isValidPermission('')).toBe(false);
        expect(validationUtils.isValidPermission(null as any)).toBe(false);
        expect(validationUtils.isValidPermission(undefined as any)).toBe(false);
        expect(validationUtils.isValidPermission('users read')).toBe(false);
        expect(validationUtils.isValidPermission('users/read')).toBe(false);
        expect(validationUtils.isValidPermission('users@read')).toBe(false);
      });
    });

    describe('isValidEmail', () => {
      it('should validate correct emails', () => {
        expect(validationUtils.isValidEmail('test@example.com')).toBe(true);
        expect(validationUtils.isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(validationUtils.isValidEmail('invalid')).toBe(false);
        expect(validationUtils.isValidEmail('invalid@')).toBe(false);
        expect(validationUtils.isValidEmail('@domain.com')).toBe(false);
        expect(validationUtils.isValidEmail('user@')).toBe(false);
      });
    });

    describe('isValidUserId', () => {
      it('should validate correct user IDs', () => {
        expect(validationUtils.isValidUserId('user123')).toBe(true);
        expect(validationUtils.isValidUserId('user_123')).toBe(true);
        expect(validationUtils.isValidUserId('user-123')).toBe(true);
      });

      it('should reject invalid user IDs', () => {
        expect(validationUtils.isValidUserId('')).toBe(false);
        expect(validationUtils.isValidUserId(null as any)).toBe(false);
        expect(validationUtils.isValidUserId('user 123')).toBe(false);
        expect(validationUtils.isValidUserId('user@123')).toBe(false);
        expect(validationUtils.isValidUserId('a'.repeat(256))).toBe(false);
      });
    });

    describe('isValidId', () => {
      it('should use same validation as user ID', () => {
        expect(validationUtils.isValidId('valid-id')).toBe(true);
        expect(validationUtils.isValidId('invalid id')).toBe(false);
      });
    });
  });

  describe('queryUtils', () => {
    describe('buildUserPermissionQuery', () => {
      it('should build permission query', () => {
        const query = queryUtils.buildUserPermissionQuery(['users.read', 'posts.write']);
        expect(query).toEqual({
          type: 'user_permission_query',
          permissions: ['users.read', 'posts.write'],
          operator: 'OR'
        });
      });
    });

    describe('buildUserGroupQuery', () => {
      it('should build group query', () => {
        const query = queryUtils.buildUserGroupQuery(['group1', 'group2']);
        expect(query).toEqual({
          type: 'user_group_query',
          groupIds: ['group1', 'group2'],
          includeNested: true
        });
      });
    });

    describe('buildUserRoleQuery', () => {
      it('should build role query', () => {
        const query = queryUtils.buildUserRoleQuery(['role1', 'role2']);
        expect(query).toEqual({
          type: 'user_role_query',
          roleIds: ['role1', 'role2'],
          operator: 'OR'
        });
      });
    });
  });

  describe('cacheUtils', () => {
    describe('cache key generation', () => {
      it('should generate user permissions key', () => {
        const key = cacheUtils.userPermissionKey('user-123');
        expect(key).toBe('user_permissions:user-123');
      });

      it('should generate user roles key', () => {
        const key = cacheUtils.userRolesKey('user-123');
        expect(key).toBe('user_roles:user-123');
      });

      it('should generate user groups key', () => {
        const key = cacheUtils.userGroupsKey('user-123');
        expect(key).toBe('user_groups:user-123');
      });
    });

    describe('isExpired', () => {
      it('should detect expired entries', () => {
        const oldTimestamp = Date.now() - 1000; // 1 second ago
        expect(cacheUtils.isExpired(oldTimestamp, 0.5)).toBe(true); // 0.5 second TTL
      });

      it('should detect non-expired entries', () => {
        const recentTimestamp = Date.now() - 100; // 0.1 seconds ago
        expect(cacheUtils.isExpired(recentTimestamp, 1)).toBe(false); // 1 second TTL
      });
    });
  });

  describe('migrationUtils', () => {
    describe('convertToConditionalPermissions', () => {
      it('should convert simple permissions array', () => {
        const permissions: Permission[] = ['users.read', 'users.write'];
        const result = migrationUtils.convertToConditionalPermissions(permissions);
        expect(result).toEqual([
          { permission: 'users.read' },
          { permission: 'users.write' }
        ]);
      });
    });

    describe('extractPermissionsFromLegacyRoles', () => {
      it('should extract permissions from legacy roles', () => {
        const legacyRoles = [
          { name: 'Admin', permissions: ['users.*', 'system.admin'] },
          { name: 'User', permissions: ['profile.read'] }
        ];

        const result = migrationUtils.extractPermissionsFromLegacyRoles(legacyRoles);
        expect(result).toEqual([
          { permission: 'users.*' },
          { permission: 'system.admin' },
          { permission: 'profile.read' }
        ]);
      });

      it('should handle roles without permissions', () => {
        const legacyRoles = [
          { name: 'Empty Role' },
          { name: 'Role with empty array', permissions: [] }
        ];

        const result = migrationUtils.extractPermissionsFromLegacyRoles(legacyRoles);
        expect(result).toEqual([]);
      });
    });

    describe('normalizePermissions', () => {
      it('should normalize permission strings', () => {
        const permissions = [' Users.Read ', 'POSTS.WRITE', 'users.read', 'comments.delete'];
        const result = migrationUtils.normalizePermissions(permissions);
        
        expect(result).toEqual([
          'users.read',
          'posts.write',
          'comments.delete'
        ]);
      });

      it('should remove duplicates', () => {
        const permissions = ['users.read', 'Users.Read', 'users.read'];
        const result = migrationUtils.normalizePermissions(permissions);
        
        expect(result).toEqual(['users.read']);
      });
    });
  });

  describe('debugUtils', () => {
    describe('logPermissionCheck', () => {
      it('should log permission check details', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        debugUtils.logPermissionCheck('user-123', 'users.read', true, { source: 'role' });

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Gatekeeper] Permission check:',
          expect.objectContaining({
            userId: 'user-123',
            permission: 'users.read',
            allowed: true,
            timestamp: expect.any(String),
            source: 'role'
          })
        );

        consoleSpy.mockRestore();
      });
    });

    describe('analyzePermissionPatterns', () => {
      it('should analyze permission patterns', () => {
        const permissions = [
          'users.*',
          'posts.read',
          'comments.write',
          '*',
          'admin.*'
        ];

        const analysis = debugUtils.analyzePermissionPatterns(permissions);

        expect(analysis).toEqual({
          wildcards: 3,
          specific: 2,
          resources: new Set(['users', 'posts', 'comments', 'admin']),
          actions: new Set(['*', 'read', 'write'])
        });
      });

      it('should handle empty permissions list', () => {
        const analysis = debugUtils.analyzePermissionPatterns([]);

        expect(analysis).toEqual({
          wildcards: 0,
          specific: 0,
          resources: new Set(),
          actions: new Set()
        });
      });
    });
  });

  describe('combined utils export', () => {
    it('should export all utility modules', () => {
      expect(utils.permission).toBe(permissionUtils);
      expect(utils.group).toBe(groupUtils);
      expect(utils.validation).toBe(validationUtils);
      expect(utils.query).toBe(queryUtils);
      expect(utils.cache).toBe(cacheUtils);
      expect(utils.migration).toBe(migrationUtils);
      expect(utils.debug).toBe(debugUtils);
    });
  });
});