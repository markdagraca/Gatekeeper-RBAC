import { PermissionEngine } from '../permission-engine';
import { RBACConfig, PermissionContext, ConditionalPermission } from '../types';

describe('PermissionEngine', () => {
  let engine: PermissionEngine;
  let mockConnector: any;

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
      permissionSeparator: '.',
      wildcardSupport: true,
      strictMode: false
    };

    engine = new PermissionEngine(config);
  });

  describe('matchesPermission', () => {
    it('should match exact permissions', () => {
      expect(engine.matchesPermission('users.read', 'users.read')).toBe(true);
      expect(engine.matchesPermission('users.write', 'users.read')).toBe(false);
    });

    it('should match wildcard permissions', () => {
      expect(engine.matchesPermission('users.read', 'users.*')).toBe(true);
      expect(engine.matchesPermission('users.write', 'users.*')).toBe(true);
      expect(engine.matchesPermission('posts.read', 'users.*')).toBe(false);
    });

    it('should match universal wildcard', () => {
      expect(engine.matchesPermission('users.read', '*')).toBe(true);
      expect(engine.matchesPermission('posts.write', '*')).toBe(true);
      expect(engine.matchesPermission('anything.else', '*')).toBe(true);
    });

    it('should match nested wildcards', () => {
      expect(engine.matchesPermission('users.john.read', 'users.*.read')).toBe(true);
      expect(engine.matchesPermission('users.jane.write', 'users.*.read')).toBe(false);
    });

    it('should not match wildcards when disabled', () => {
      const configNoWildcard: RBACConfig = {
        connector: mockConnector,
        wildcardSupport: false
      };
      const engineNoWildcard = new PermissionEngine(configNoWildcard);
      
      expect(engineNoWildcard.matchesPermission('users.read', 'users.*')).toBe(false);
      expect(engineNoWildcard.matchesPermission('users.read', 'users.read')).toBe(true);
    });
  });

  describe('evaluateConditions', () => {
    const context: PermissionContext = {
      userId: 'user-123',
      attributes: {
        department: 'engineering',
        level: 'senior',
        country: 'US',
        score: 85,
        tags: ['admin', 'developer']
      }
    };

    it('should return true for empty conditions', () => {
      expect(engine.evaluateConditions([], context)).toBe(true);
      expect(engine.evaluateConditions(undefined as any, context)).toBe(true);
    });

    it('should evaluate equals condition', () => {
      const condition = [{
        attribute: 'attributes.department',
        operator: 'equals' as const,
        value: 'engineering'
      }];
      expect(engine.evaluateConditions(condition, context)).toBe(true);

      const failCondition = [{
        attribute: 'attributes.department',
        operator: 'equals' as const,
        value: 'marketing'
      }];
      expect(engine.evaluateConditions(failCondition, context)).toBe(false);
    });

    it('should evaluate notEquals condition', () => {
      const condition = [{
        attribute: 'attributes.department',
        operator: 'notEquals' as const,
        value: 'marketing'
      }];
      expect(engine.evaluateConditions(condition, context)).toBe(true);

      const failCondition = [{
        attribute: 'attributes.department',
        operator: 'notEquals' as const,
        value: 'engineering'
      }];
      expect(engine.evaluateConditions(failCondition, context)).toBe(false);
    });

    it('should evaluate in condition', () => {
      const condition = [{
        attribute: 'attributes.department',
        operator: 'in' as const,
        value: ['engineering', 'marketing']
      }];
      expect(engine.evaluateConditions(condition, context)).toBe(true);

      const failCondition = [{
        attribute: 'attributes.department',
        operator: 'in' as const,
        value: ['sales', 'marketing']
      }];
      expect(engine.evaluateConditions(failCondition, context)).toBe(false);
    });

    it('should evaluate notIn condition', () => {
      const condition = [{
        attribute: 'attributes.department',
        operator: 'notIn' as const,
        value: ['sales', 'marketing']
      }];
      expect(engine.evaluateConditions(condition, context)).toBe(true);

      const failCondition = [{
        attribute: 'attributes.department',
        operator: 'notIn' as const,
        value: ['engineering', 'marketing']
      }];
      expect(engine.evaluateConditions(failCondition, context)).toBe(false);
    });

    it('should evaluate string conditions', () => {
      const startsWithCondition = [{
        attribute: 'attributes.department',
        operator: 'startsWith' as const,
        value: 'eng'
      }];
      expect(engine.evaluateConditions(startsWithCondition, context)).toBe(true);

      const endsWithCondition = [{
        attribute: 'attributes.department',
        operator: 'endsWith' as const,
        value: 'ing'
      }];
      expect(engine.evaluateConditions(endsWithCondition, context)).toBe(true);

      const containsCondition = [{
        attribute: 'attributes.department',
        operator: 'contains' as const,
        value: 'neer'
      }];
      expect(engine.evaluateConditions(containsCondition, context)).toBe(true);
    });

    it('should evaluate numeric conditions', () => {
      const greaterThanCondition = [{
        attribute: 'attributes.score',
        operator: 'greaterThan' as const,
        value: 80
      }];
      expect(engine.evaluateConditions(greaterThanCondition, context)).toBe(true);

      const lessThanCondition = [{
        attribute: 'attributes.score',
        operator: 'lessThan' as const,
        value: 90
      }];
      expect(engine.evaluateConditions(lessThanCondition, context)).toBe(true);

      const failCondition = [{
        attribute: 'attributes.score',
        operator: 'lessThan' as const,
        value: 80
      }];
      expect(engine.evaluateConditions(failCondition, context)).toBe(false);
    });

    it('should handle missing attributes', () => {
      const condition = [{
        attribute: 'attributes.missing',
        operator: 'equals' as const,
        value: 'test'
      }];
      expect(engine.evaluateConditions(condition, context)).toBe(false);
    });

    it('should handle invalid operators', () => {
      const condition = [{
        attribute: 'attributes.department',
        operator: 'invalid' as any,
        value: 'test'
      }];
      expect(engine.evaluateConditions(condition, context)).toBe(false);
    });

    it('should handle type mismatches for string operations', () => {
      const condition = [{
        attribute: 'attributes.score',
        operator: 'startsWith' as const,
        value: 'test'
      }];
      expect(engine.evaluateConditions(condition, context)).toBe(false);
    });

    it('should handle type mismatches for numeric operations', () => {
      const condition = [{
        attribute: 'attributes.department',
        operator: 'greaterThan' as const,
        value: 50
      }];
      expect(engine.evaluateConditions(condition, context)).toBe(false);
    });
  });

  describe('evaluatePermissions', () => {
    const context: PermissionContext = {
      userId: 'user-123',
      attributes: { department: 'engineering' }
    };

    it('should allow permission with no conditions', () => {
      const permissions: ConditionalPermission[] = [
        { permission: 'users.read' }
      ];

      const result = engine.evaluatePermissions('users.read', permissions, context);
      expect(result.allowed).toBe(true);
      expect(result.matchedPermissions).toHaveLength(1);
    });

    it('should allow permission with matching conditions', () => {
      const permissions: ConditionalPermission[] = [
        {
          permission: 'users.read',
          conditions: [{
            attribute: 'attributes.department',
            operator: 'equals',
            value: 'engineering'
          }]
        }
      ];

      const result = engine.evaluatePermissions('users.read', permissions, context);
      expect(result.allowed).toBe(true);
      expect(result.matchedPermissions).toHaveLength(1);
    });

    it('should deny permission with non-matching conditions', () => {
      const permissions: ConditionalPermission[] = [
        {
          permission: 'users.read',
          conditions: [{
            attribute: 'attributes.department',
            operator: 'equals',
            value: 'marketing'
          }]
        }
      ];

      const result = engine.evaluatePermissions('users.read', permissions, context);
      expect(result.allowed).toBe(false);
      expect(result.matchedPermissions).toHaveLength(0);
    });

    it('should handle explicit deny permissions', () => {
      const permissions: ConditionalPermission[] = [
        { permission: 'users.read', effect: 'allow' },
        { permission: 'users.read', effect: 'deny' }
      ];

      const result = engine.evaluatePermissions('users.read', permissions, context);
      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toHaveLength(1);
    });

    it('should match wildcard permissions', () => {
      const permissions: ConditionalPermission[] = [
        { permission: 'users.*' }
      ];

      const result = engine.evaluatePermissions('users.read', permissions, context);
      expect(result.allowed).toBe(true);
      expect(result.matchedPermissions).toHaveLength(1);
    });

    it('should handle strict mode', () => {
      const strictConfig: RBACConfig = {
        connector: mockConnector,
        strictMode: true
      };
      const strictEngine = new PermissionEngine(strictConfig);

      const result = strictEngine.evaluatePermissions('users.read', [], context);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('strict mode');
    });
  });

  describe('normalizePermission', () => {
    it('should normalize permission format', () => {
      expect(engine.normalizePermission('Users.Read')).toBe('users.read');
      expect(engine.normalizePermission('users..read')).toBe('users.read');
      expect(engine.normalizePermission('users...read')).toBe('users.read');
    });
  });

  describe('parsePermission', () => {
    it('should parse three-part permission', () => {
      const result = engine.parsePermission('service.resource.action');
      expect(result).toEqual({
        service: 'service',
        resource: 'resource',
        action: 'action',
        components: ['service', 'resource', 'action']
      });
    });

    it('should parse two-part permission', () => {
      const result = engine.parsePermission('resource.action');
      expect(result).toEqual({
        resource: 'resource',
        action: 'action',
        components: ['resource', 'action']
      });
    });

    it('should parse single-part permission', () => {
      const result = engine.parsePermission('action');
      expect(result).toEqual({
        action: 'action',
        components: ['action']
      });
    });

    it('should handle malformed permissions', () => {
      const result = engine.parsePermission('a.b.c.d.e');
      expect(result).toEqual({
        components: ['a', 'b', 'c', 'd', 'e']
      });
    });
  });
});