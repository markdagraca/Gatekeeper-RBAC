/**
 * Additional PermissionEngine tests to achieve 100% coverage
 */

import { PermissionEngine } from '../permission-engine';
import { RBACConfig } from '../types';

describe('PermissionEngine - Coverage Tests', () => {
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

  it('should handle getResultReason for all scenarios', () => {
    // Test private method through evaluatePermissions
    const context = { userId: 'user-123' };

    // Test "access granted" reason
    const allowResult = engine.evaluatePermissions(
      'users.read',
      [{ permission: 'users.read' }],
      context
    );
    expect(allowResult.reason).toContain('Access granted by permission');

    // Test "no matching permissions" reason with strict mode
    const strictConfig: RBACConfig = {
      connector: mockConnector,
      strictMode: true
    };
    const strictEngine = new PermissionEngine(strictConfig);
    
    const strictResult = strictEngine.evaluatePermissions(
      'users.read',
      [],
      context
    );
    expect(strictResult.reason).toContain('strict mode');

    // Test regular "no matching permissions" reason
    const noMatchResult = engine.evaluatePermissions(
      'users.read',
      [{ permission: 'posts.read' }],
      context
    );
    expect(noMatchResult.reason).toContain('No matching permissions found');
  });

  it('should handle edge cases in parsePermission', () => {
    // Test empty string
    const emptyResult = engine.parsePermission('');
    expect(emptyResult).toEqual({
      action: '',
      components: ['']
    });

    // Test single character
    const singleResult = engine.parsePermission('a');
    expect(singleResult).toEqual({
      action: 'a',
      components: ['a']
    });
  });

  it('should handle fallback "Access granted" reason - line 240', () => {
    // Create a mock scenario where allowed is true but no matched permissions
    // This is an edge case that would happen in getResultReason
    const context = { userId: 'user-123' };
    
    // Test the private getResultReason method indirectly by creating a scenario
    // where allowed would be true but matchedPermissions is empty
    const result = engine.evaluatePermissions(
      'test.permission',
      [], // Empty permissions array
      context
    );

    // In normal cases this would be denied, but let's test the edge case
    // by directly accessing the private method if possible
    const getResultReason = (engine as any).getResultReason;
    
    // Test the specific line 240 case: allowed=true, no matched, no denied
    const reasonResult = getResultReason(true, [], []);
    expect(reasonResult).toBe('Access granted');
  });
});