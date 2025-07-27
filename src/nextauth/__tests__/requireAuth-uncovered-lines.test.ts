/**
 * Tests for uncovered lines in requireAuth function
 * Specifically targeting browser signIn call and permission checking
 */

// Mock next-auth/react
const mockUseSession = jest.fn();
const mockSignIn = jest.fn();
jest.mock('next-auth/react', () => ({
  useSession: mockUseSession,
  signIn: mockSignIn
}));

// Mock React
const mockCreateElement = jest.fn((type, props, ...children) => ({ type, props, children }));
jest.mock('react', () => ({
  createElement: mockCreateElement
}));

import { requireAuth } from '../index';

describe('requireAuth Uncovered Lines', () => {
  const mockRbac = {
    hasPermission: jest.fn(),
    getUserEffectivePermissions: jest.fn(),
    getUserRoles: jest.fn(),
    getUserGroups: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateElement.mockImplementation((type, props, ...children) => ({ type, props, children }));
    // Clear window mock
    delete (global as any).window;
  });

  describe('Browser signIn call (lines 523-524)', () => {
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

      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any)(TestComponent);
      
      const result = ProtectedComponent({});
      
      // Should call signIn when in browser (lines 523-524)
      expect(mockSignIn).toHaveBeenCalled();
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Redirecting to login...']);
    });

    it('should NOT call signIn when unauthenticated in server environment', () => {
      // Server environment - no window
      expect(typeof window).toBe('undefined');

      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any)(TestComponent);
      
      const result = ProtectedComponent({});
      
      // Should NOT call signIn in server environment
      expect(mockSignIn).not.toHaveBeenCalled();
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Redirecting to login...']);
    });
  });

  describe('Permission checking (lines 531-535)', () => {
    it('should deny access when user lacks required permissions', () => {
      // Mock authenticated session with limited permissions
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          permissions: ['read'], // Only has 'read' permission
          roles: ['user']
        },
        status: 'authenticated'
      });

      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any, {
        permissions: ['write', 'admin'] // User doesn't have these permissions
      })(TestComponent);
      
      const result = ProtectedComponent({});
      
      // Should return access denied (lines 534-535)
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Access Denied: Insufficient permissions']);
    });

    it('should allow access when user has all required permissions', () => {
      // Mock authenticated session with all required permissions
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          permissions: ['read', 'write', 'admin'], // Has all permissions
          roles: ['user', 'admin']
        },
        status: 'authenticated'
      });

      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any, {
        permissions: ['read', 'write'] // User has these permissions
      })(TestComponent);
      
      const result = ProtectedComponent({});
      
      // Should render the component (permissions check passed)
      expect(result.type).toBe(TestComponent);
    });

    it('should skip permission check when no permissions required', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          permissions: ['read'],
          roles: ['user']
        },
        status: 'authenticated'
      });

      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any)(TestComponent); // No options
      
      const result = ProtectedComponent({});
      
      // Should render the component (no permission requirements)
      expect(result.type).toBe(TestComponent);
    });
  });

  describe('Role checking coverage', () => {
    it('should deny access when user lacks required roles', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          permissions: ['read'],
          roles: ['user'] // Only has 'user' role, not 'admin'
        },
        status: 'authenticated'
      });

      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any, {
        roles: ['admin'] // User doesn't have admin role
      })(TestComponent);
      
      const result = ProtectedComponent({});
      
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Access Denied: Insufficient role']);
    });

    it('should allow access when user has required roles', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          permissions: ['read'],
          roles: ['user', 'admin'] // Has required roles
        },
        status: 'authenticated'
      });

      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any, {
        roles: ['user'] // User has this role
      })(TestComponent);
      
      const result = ProtectedComponent({});
      
      expect(result.type).toBe(TestComponent);
    });
  });

  describe('Edge cases', () => {
    it('should handle loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      });

      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any)(TestComponent);
      
      const result = ProtectedComponent({});
      
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Loading...']);
    });

    it('should handle both permissions and roles requirements', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          permissions: ['read', 'write'], // Has required permissions
          roles: ['user'] // Doesn't have required role
        },
        status: 'authenticated'
      });

      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any, {
        permissions: ['read'],
        roles: ['admin'] // Will fail on role check
      })(TestComponent);
      
      const result = ProtectedComponent({});
      
      // Should fail on role check even though permissions pass
      expect(result.type).toBe('div');
      expect(result.children).toEqual(['Access Denied: Insufficient role']);
    });
  });
});