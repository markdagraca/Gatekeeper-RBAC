/**
 * Type validation tests for the core RBAC types
 * These tests ensure type safety and validate interface contracts
 */

import {
  Permission,
  ConditionalPermission,
  PermissionCondition,
  PermissionContext,
  PermissionResult,
  User,
  Group,
  Role,
  UserAssignment,
  PermissionTemplate,
  DatabaseConnector,
  RBACConfig,
  NextAuthUser,
  NextAuthSession,
  NextAuthToken
} from '../types';

describe('Core Types', () => {
  describe('Permission types', () => {
    it('should accept valid permission strings', () => {
      const permission: Permission = 'users.read';
      expect(typeof permission).toBe('string');
    });

    it('should create valid conditional permissions', () => {
      const conditionalPermission: ConditionalPermission = {
        permission: 'users.read',
        conditions: [
          {
            attribute: 'userId',
            operator: 'equals',
            value: 'user-123'
          }
        ],
        effect: 'allow'
      };

      expect(conditionalPermission.permission).toBe('users.read');
      expect(conditionalPermission.conditions).toHaveLength(1);
      expect(conditionalPermission.effect).toBe('allow');
    });

    it('should create valid permission conditions', () => {
      const condition: PermissionCondition = {
        attribute: 'department',
        operator: 'in',
        value: ['engineering', 'design']
      };

      expect(condition.attribute).toBe('department');
      expect(condition.operator).toBe('in');
      expect(Array.isArray(condition.value)).toBe(true);
    });

    it('should create valid permission context', () => {
      const context: PermissionContext = {
        userId: 'user-123',
        resource: 'document-456',
        action: 'read',
        attributes: {
          department: 'engineering',
          level: 'senior'
        },
        timestamp: new Date()
      };

      expect(context.userId).toBe('user-123');
      expect(context.resource).toBe('document-456');
      expect(context.attributes).toEqual({
        department: 'engineering',
        level: 'senior'
      });
    });

    it('should create valid permission result', () => {
      const result: PermissionResult = {
        allowed: true,
        reason: 'Access granted by role permission',
        matchedPermissions: [
          { permission: 'users.read' }
        ],
        deniedBy: undefined
      };

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeTruthy();
      expect(result.matchedPermissions).toHaveLength(1);
    });
  });

  describe('Entity types', () => {
    it('should create valid user', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          department: 'engineering',
          joinDate: '2023-01-01'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.metadata).toEqual({
        department: 'engineering',
        joinDate: '2023-01-01'
      });
    });

    it('should create valid role', () => {
      const role: Role = {
        id: 'admin-role',
        name: 'Administrator',
        description: 'Full admin access',
        permissions: [
          { permission: 'users.*' },
          { 
            permission: 'system.admin',
            conditions: [
              {
                attribute: 'location',
                operator: 'equals',
                value: 'headquarters'
              }
            ]
          }
        ],
        metadata: {
          category: 'system',
          priority: 'high'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(role.id).toBe('admin-role');
      expect(role.name).toBe('Administrator');
      expect(role.permissions).toHaveLength(2);
      expect(role.permissions[1].conditions).toHaveLength(1);
    });

    it('should create valid group with nested structure', () => {
      const nestedGroup: Group = {
        id: 'sub-group',
        name: 'Sub Group',
        members: ['user-456'],
        permissions: [{ permission: 'nested.permission' }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const group: Group = {
        id: 'parent-group',
        name: 'Parent Group',
        description: 'Top level group',
        members: ['user-123', nestedGroup],
        permissions: [
          { permission: 'group.read' },
          { permission: 'group.manage' }
        ],
        metadata: {
          type: 'department',
          location: 'building-a'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(group.members).toHaveLength(2);
      expect(typeof group.members[0]).toBe('string');
      expect(typeof group.members[1]).toBe('object');
      expect((group.members[1] as Group).id).toBe('sub-group');
    });

    it('should create valid user assignment', () => {
      const assignment: UserAssignment = {
        userId: 'user-123',
        roleIds: ['role-1', 'role-2'],
        groupIds: ['group-1', 'group-2'],
        directPermissions: [
          { permission: 'special.access' }
        ],
        metadata: {
          assignedBy: 'admin-user',
          assignedAt: '2023-01-01'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(assignment.userId).toBe('user-123');
      expect(assignment.roleIds).toHaveLength(2);
      expect(assignment.groupIds).toHaveLength(2);
      expect(assignment.directPermissions).toHaveLength(1);
    });

    it('should create valid permission template', () => {
      const template: PermissionTemplate = {
        id: 'template-123',
        name: 'CRUD Template',
        description: 'Standard CRUD operations template',
        permissions: [
          { permission: '${resource}.create' },
          { permission: '${resource}.read' },
          { permission: '${resource}.update' },
          { permission: '${resource}.delete' }
        ],
        variables: {
          resource: 'users'
        },
        metadata: {
          category: 'standard',
          version: '1.0'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(template.id).toBe('template-123');
      expect(template.permissions).toHaveLength(4);
      expect(template.variables?.resource).toBe('users');
    });
  });

  describe('Configuration types', () => {
    it('should create valid RBAC config', () => {
      const mockConnector: DatabaseConnector = {
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
        permissionSeparator: '.',
        wildcardSupport: true,
        cacheEnabled: true,
        cacheTTL: 300,
        strictMode: false
      };

      expect(config.connector).toBe(mockConnector);
      expect(config.permissionSeparator).toBe('.');
      expect(config.wildcardSupport).toBe(true);
      expect(config.cacheEnabled).toBe(true);
      expect(config.cacheTTL).toBe(300);
      expect(config.strictMode).toBe(false);
    });
  });

  describe('NextAuth integration types', () => {
    it('should create valid NextAuth user', () => {
      const user: NextAuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg'
      };

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.image).toBe('https://example.com/avatar.jpg');
    });

    it('should create valid NextAuth session', () => {
      const session: NextAuthSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        },
        permissions: ['users.read', 'posts.write'],
        roles: ['editor', 'reviewer'],
        groups: ['content-team', 'reviewers'],
        expires: '2024-12-31T23:59:59.999Z'
      };

      expect(session.user.id).toBe('user-123');
      expect(session.permissions).toHaveLength(2);
      expect(session.roles).toHaveLength(2);
      expect(session.groups).toHaveLength(2);
      expect(session.expires).toBeTruthy();
    });

    it('should create valid NextAuth token', () => {
      const token: NextAuthToken = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        permissions: ['users.read', 'posts.write'],
        roles: ['editor'],
        groups: ['content-team']
      };

      expect(token.sub).toBe('user-123');
      expect(token.permissions).toHaveLength(2);
      expect(token.roles).toHaveLength(1);
      expect(token.groups).toHaveLength(1);
    });
  });

  describe('Type constraints and optional fields', () => {
    it('should allow minimal user creation', () => {
      const minimalUser: User = {
        id: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(minimalUser.id).toBe('user-123');
      expect(minimalUser.email).toBeUndefined();
      expect(minimalUser.name).toBeUndefined();
      expect(minimalUser.metadata).toBeUndefined();
    });

    it('should allow minimal role creation', () => {
      const minimalRole: Role = {
        id: 'role-123',
        name: 'Minimal Role',
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(minimalRole.id).toBe('role-123');
      expect(minimalRole.description).toBeUndefined();
      expect(minimalRole.metadata).toBeUndefined();
      expect(minimalRole.permissions).toHaveLength(0);
    });

    it('should allow minimal group creation', () => {
      const minimalGroup: Group = {
        id: 'group-123',
        name: 'Minimal Group',
        members: [],
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(minimalGroup.id).toBe('group-123');
      expect(minimalGroup.description).toBeUndefined();
      expect(minimalGroup.metadata).toBeUndefined();
      expect(minimalGroup.members).toHaveLength(0);
      expect(minimalGroup.permissions).toHaveLength(0);
    });

    it('should allow minimal conditional permission', () => {
      const minimalPermission: ConditionalPermission = {
        permission: 'users.read'
      };

      expect(minimalPermission.permission).toBe('users.read');
      expect(minimalPermission.conditions).toBeUndefined();
      expect(minimalPermission.effect).toBeUndefined();
    });

    it('should allow user assignment without direct permissions', () => {
      const assignment: UserAssignment = {
        userId: 'user-123',
        roleIds: ['role-1'],
        groupIds: ['group-1'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(assignment.directPermissions).toBeUndefined();
      expect(assignment.metadata).toBeUndefined();
    });
  });

  describe('Operator type constraints', () => {
    it('should accept all valid condition operators', () => {
      const operators: PermissionCondition['operator'][] = [
        'equals',
        'notEquals',
        'in',
        'notIn',
        'startsWith',
        'endsWith',
        'contains',
        'greaterThan',
        'lessThan'
      ];

      operators.forEach(operator => {
        const condition: PermissionCondition = {
          attribute: 'test',
          operator,
          value: 'test-value'
        };
        expect(condition.operator).toBe(operator);
      });
    });

    it('should accept different value types for conditions', () => {
      const stringCondition: PermissionCondition = {
        attribute: 'name',
        operator: 'equals',
        value: 'test-string'
      };

      const numberCondition: PermissionCondition = {
        attribute: 'score',
        operator: 'greaterThan',
        value: 85
      };

      const booleanCondition: PermissionCondition = {
        attribute: 'active',
        operator: 'equals',
        value: true
      };

      const arrayCondition: PermissionCondition = {
        attribute: 'roles',
        operator: 'in',
        value: ['admin', 'user']
      };

      expect(typeof stringCondition.value).toBe('string');
      expect(typeof numberCondition.value).toBe('number');
      expect(typeof booleanCondition.value).toBe('boolean');
      expect(Array.isArray(arrayCondition.value)).toBe(true);
    });
  });

  describe('Effect type constraints', () => {
    it('should accept valid effect values', () => {
      const allowPermission: ConditionalPermission = {
        permission: 'users.read',
        effect: 'allow'
      };

      const denyPermission: ConditionalPermission = {
        permission: 'users.delete',
        effect: 'deny'
      };

      expect(allowPermission.effect).toBe('allow');
      expect(denyPermission.effect).toBe('deny');
    });
  });
});