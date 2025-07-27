/**
 * Complete coverage tests for 100% line and branch coverage
 */

// Mock all external dependencies first
const mockUseSession = jest.fn();
const mockSignIn = jest.fn();
const mockCreateElement = jest.fn((type, props, ...children) => ({ type, props, children }));

jest.doMock('next-auth/react', () => ({
  useSession: mockUseSession,
  signIn: mockSignIn
}));

jest.doMock('react', () => ({
  createElement: mockCreateElement
}));

// Mock RBAC
const mockRbac = {
  hasPermission: jest.fn(),
  getUserEffectivePermissions: jest.fn(),
  getUserRoles: jest.fn(),
  getUserGroups: jest.fn()
};

describe('Complete Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module cache to ensure clean imports
    delete require.cache[require.resolve('../index')];
    
    // Reset window mock
    delete (global as any).window;
  });

  describe('requireAuth - Uncovered Lines 523-524', () => {
    it('should call signIn when unauthenticated in browser environment', () => {
      // Mock browser environment (window exists)
      Object.defineProperty(global, 'window', {
        value: {},
        configurable: true
      });

      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      const { requireAuth } = require('../index');
      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any)(TestComponent);
      
      const result = ProtectedComponent({});
      
      // Should call signIn (line 523-524)
      expect(mockSignIn).toHaveBeenCalled();
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Redirecting to login...']);
    });

    it('should NOT call signIn when unauthenticated in server environment', () => {
      // Ensure no window object (server environment)
      expect(typeof window).toBe('undefined');

      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      const { requireAuth } = require('../index');
      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any)(TestComponent);
      
      const result = ProtectedComponent({});
      
      // Should NOT call signIn in server environment
      expect(mockSignIn).not.toHaveBeenCalled();
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Redirecting to login...']);
    });
  });

  describe('requireAuth - Permission Check Lines 531-535', () => {
    beforeEach(() => {
      // Mock authenticated session
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          permissions: ['read'],
          roles: ['user'],
          groups: ['group1']
        },
        status: 'authenticated'
      });
    });

    it('should deny access when user lacks required permissions', () => {
      const { requireAuth, useGatekeeperPermissions } = require('../index');
      
      // Mock useGatekeeperPermissions to return permission checker
      const mockPermissionChecker = {
        hasPermission: jest.fn((permission) => permission === 'read'), // Only has 'read'
        hasRole: jest.fn(() => true)
      };
      
      // Replace the useGatekeeperPermissions call in requireAuth
      jest.doMock('../index', () => {
        const originalModule = jest.requireActual('../index');
        return {
          ...originalModule,
          useGatekeeperPermissions: () => mockPermissionChecker
        };
      });

      // Re-import to get the mocked version
      delete require.cache[require.resolve('../index')];
      const { requireAuth: MockedRequireAuth } = require('../index');

      const TestComponent = () => 'test';
      const ProtectedComponent = MockedRequireAuth(mockRbac as any, {
        permissions: ['write', 'admin'] // User doesn't have these permissions
      })(TestComponent);
      
      const result = ProtectedComponent({});
      
      // Should return access denied (lines 531-535)
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Access Denied: Insufficient permissions']);
    });

    it('should allow access when user has all required permissions', () => {
      const { requireAuth } = require('../index');
      
      // Mock useGatekeeperPermissions to return permission checker
      const mockPermissionChecker = {
        hasPermission: jest.fn(() => true), // Has all permissions
        hasRole: jest.fn(() => true)
      };
      
      // Replace the useGatekeeperPermissions call
      jest.doMock('../index', () => {
        const originalModule = jest.requireActual('../index');
        return {
          ...originalModule,
          useGatekeeperPermissions: () => mockPermissionChecker
        };
      });

      // Re-import to get the mocked version
      delete require.cache[require.resolve('../index')];
      const { requireAuth: MockedRequireAuth } = require('../index');

      const TestComponent = () => 'test';
      const ProtectedComponent = MockedRequireAuth(mockRbac as any, {
        permissions: ['read', 'write']
      })(TestComponent);
      
      const result = ProtectedComponent({});
      
      // Should render the component (permissions check passed)
      expect(result.type).toBe(TestComponent);
    });

    it('should handle requireAuth without permissions option', () => {
      const { requireAuth } = require('../index');
      
      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any)(TestComponent); // No options
      
      const result = ProtectedComponent({});
      
      // Should render the component (no permission requirements)
      expect(result.type).toBe(TestComponent);
    });
  });

  describe('Role Check Coverage', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          permissions: ['read'],
          roles: ['user'],
          groups: ['group1']
        },
        status: 'authenticated'
      });
    });

    it('should deny access when user lacks required roles', () => {
      const { requireAuth } = require('../index');
      
      // Mock useGatekeeperPermissions
      const mockPermissionChecker = {
        hasPermission: jest.fn(() => true),
        hasRole: jest.fn(() => false) // User doesn't have required role
      };
      
      jest.doMock('../index', () => {
        const originalModule = jest.requireActual('../index');
        return {
          ...originalModule,
          useGatekeeperPermissions: () => mockPermissionChecker
        };
      });

      delete require.cache[require.resolve('../index')];
      const { requireAuth: MockedRequireAuth } = require('../index');

      const TestComponent = () => 'test';
      const ProtectedComponent = MockedRequireAuth(mockRbac as any, {
        roles: ['admin'] // User doesn't have admin role
      })(TestComponent);
      
      const result = ProtectedComponent({});
      
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Access Denied: Insufficient role']);
    });

    it('should allow access when user has required roles', () => {
      const { requireAuth } = require('../index');
      
      const mockPermissionChecker = {
        hasPermission: jest.fn(() => true),
        hasRole: jest.fn(() => true) // User has required role
      };
      
      jest.doMock('../index', () => {
        const originalModule = jest.requireActual('../index');
        return {
          ...originalModule,
          useGatekeeperPermissions: () => mockPermissionChecker
        };
      });

      delete require.cache[require.resolve('../index')];
      const { requireAuth: MockedRequireAuth } = require('../index');

      const TestComponent = () => 'test';
      const ProtectedComponent = MockedRequireAuth(mockRbac as any, {
        roles: ['user']
      })(TestComponent);
      
      const result = ProtectedComponent({});
      
      expect(result.type).toBe(TestComponent);
    });
  });
});