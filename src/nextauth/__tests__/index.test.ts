import {
  createGatekeeperCallbacks,
  useGatekeeperPermissions,
  checkServerPermission,
  createPermissionMiddleware,
  withRBAC,
  syncUserWithGatekeeper
} from '../index';
import { RBAC } from '../../core/rbac';

// Mock RBAC
const mockRBAC = {
  hasPermission: jest.fn(),
  getUserEffectivePermissions: jest.fn(),
  getUserRoles: jest.fn(),
  getUserGroups: jest.fn(),
  connector: {
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn()
  }
} as any;

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn()
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

// Mock React
jest.mock('react', () => ({
  createElement: jest.fn()
}));

describe('NextAuth Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGatekeeperCallbacks', () => {
    const config = {
      rbac: mockRBAC,
      includePermissionsInSession: true,
      includeRolesInSession: true,
      includeGroupsInSession: true
    };

    describe('jwt callback', () => {
      it('should add RBAC data to token on sign in', async () => {
        const mockPermissions = [{ permission: 'users.read' }];
        const mockRoles = [{ id: 'admin', name: 'Admin' }];
        const mockGroups = [{ id: 'group1', name: 'Group 1' }];

        mockRBAC.getUserEffectivePermissions.mockResolvedValue(mockPermissions);
        mockRBAC.getUserRoles.mockResolvedValue(mockRoles);
        mockRBAC.getUserGroups.mockResolvedValue(mockGroups);

        const callbacks = createGatekeeperCallbacks(config);
        const token = { sub: 'existing-user' };
        const user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

        const result = await callbacks.jwt({ token, user });

        expect(result.sub).toBe('user-123');
        expect(result.email).toBe('test@example.com');
        expect(result.name).toBe('Test User');
        expect(result.permissions).toEqual(['users.read']);
        expect(result.roles).toEqual(['admin']);
        expect(result.groups).toEqual(['group1']);
      });

      it('should handle RBAC errors gracefully', async () => {
        mockRBAC.getUserEffectivePermissions.mockRejectedValue(new Error('DB error'));

        const callbacks = createGatekeeperCallbacks(config);
        const token = { sub: 'existing-user' };
        const user = { id: 'user-123', email: 'test@example.com' };

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await callbacks.jwt({ token, user });

        expect(result.sub).toBe('user-123');
        expect(result.permissions).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error loading RBAC data for user:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it('should return token without changes when no user', async () => {
        const callbacks = createGatekeeperCallbacks(config);
        const token = { sub: 'existing-user' };

        const result = await callbacks.jwt({ token });

        expect(result).toBe(token);
        expect(mockRBAC.getUserEffectivePermissions).not.toHaveBeenCalled();
      });

      it('should skip permissions when disabled', async () => {
        const configWithoutPermissions = {
          ...config,
          includePermissionsInSession: false
        };

        const callbacks = createGatekeeperCallbacks(configWithoutPermissions);
        const token = { sub: 'existing-user' };
        const user = { id: 'user-123' };

        await callbacks.jwt({ token, user });

        expect(mockRBAC.getUserEffectivePermissions).not.toHaveBeenCalled();
      });
    });

    describe('session callback', () => {
      it('should add RBAC data to session from token', async () => {
        const callbacks = createGatekeeperCallbacks(config);
        const session = {
          user: { email: 'test@example.com' },
          expires: '2024-12-31'
        };
        const token = {
          sub: 'user-123',
          permissions: ['users.read'],
          roles: ['admin'],
          groups: ['group1']
        };

        const result = await callbacks.session({ session, token }) as any;

        expect(result.user.id).toBe('user-123');
        expect(result.permissions).toEqual(['users.read']);
        expect(result.roles).toEqual(['admin']);
        expect(result.groups).toEqual(['group1']);
      });

      it('should handle missing token data', async () => {
        const callbacks = createGatekeeperCallbacks(config);
        const session = {
          user: { email: 'test@example.com' },
          expires: '2024-12-31'
        };
        const token = {};

        const result = await callbacks.session({ session, token }) as any;

        expect(result.user.id).toBeUndefined();
        expect(result.permissions).toBeUndefined();
      });
    });
  });

  describe('useGatekeeperPermissions', () => {
    const mockUseSession = require('next-auth/react').useSession;

    it('should return permission checking functions', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          permissions: ['users.read', 'users.write'],
          roles: ['admin', 'editor'],
          groups: ['group1'],
          expires: '2024-12-31'
        }
      });

      const {
        permissions,
        roles,
        groups,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        inGroup,
        inAnyGroup
      } = useGatekeeperPermissions();

      expect(permissions).toEqual(['users.read', 'users.write']);
      expect(roles).toEqual(['admin', 'editor']);
      expect(groups).toEqual(['group1']);

      expect(hasPermission('users.read')).toBe(true);
      expect(hasPermission('users.delete')).toBe(false);

      expect(hasAnyPermission(['users.read', 'posts.read'])).toBe(true);
      expect(hasAllPermissions(['users.read', 'users.write'])).toBe(true);
      expect(hasAllPermissions(['users.read', 'users.delete'])).toBe(false);

      expect(hasRole('admin')).toBe(true);
      expect(hasRole('user')).toBe(false);

      expect(hasAnyRole(['admin', 'user'])).toBe(true);
      expect(hasAnyRole(['user', 'guest'])).toBe(false);

      expect(inGroup('group1')).toBe(true);
      expect(inGroup('group2')).toBe(false);

      expect(inAnyGroup(['group1', 'group2'])).toBe(true);
      expect(inAnyGroup(['group2', 'group3'])).toBe(false);
    });

    it('should handle null session', () => {
      mockUseSession.mockReturnValue({ data: null });

      const {
        permissions,
        roles,
        groups,
        hasPermission
      } = useGatekeeperPermissions();

      expect(permissions).toEqual([]);
      expect(roles).toEqual([]);
      expect(groups).toEqual([]);
      expect(hasPermission('users.read')).toBe(false);
    });

    it('should handle session without RBAC data', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123' },
          expires: '2024-12-31'
        }
      });

      const { hasPermission } = useGatekeeperPermissions();

      expect(hasPermission('users.read')).toBe(false);
    });
  });

  describe('checkServerPermission', () => {
    it('should check permission and return result', async () => {
      mockRBAC.hasPermission.mockResolvedValue({ allowed: true });

      const result = await checkServerPermission(mockRBAC, 'user-123', 'users.read');

      expect(result).toBe(true);
      expect(mockRBAC.hasPermission).toHaveBeenCalledWith('user-123', 'users.read', undefined);
    });

    it('should handle permission check errors', async () => {
      mockRBAC.hasPermission.mockRejectedValue(new Error('DB error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await checkServerPermission(mockRBAC, 'user-123', 'users.read');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking server permission:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should pass context to permission check', async () => {
      const context = { resource: 'document-123' };
      mockRBAC.hasPermission.mockResolvedValue({ allowed: true });

      await checkServerPermission(mockRBAC, 'user-123', 'users.read', context);

      expect(mockRBAC.hasPermission).toHaveBeenCalledWith('user-123', 'users.read', context);
    });
  });

  describe('createPermissionMiddleware', () => {
    const mockGetServerSession = jest.fn();
    const mockReq = {};
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const mockNext = jest.fn();

    beforeEach(() => {
      jest.doMock('next-auth/next', () => ({
        getServerSession: mockGetServerSession
      }));
    });

    it('should create middleware that checks permissions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      mockRBAC.hasPermission.mockResolvedValue({ allowed: true });

      const middleware = createPermissionMiddleware(mockRBAC);
      const requirePermission = middleware('users.read');

      await requirePermission(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const middleware = createPermissionMiddleware(mockRBAC);
      const requirePermission = middleware('users.read');

      await requirePermission(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when permission denied', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      mockRBAC.hasPermission.mockResolvedValue({ allowed: false });

      const middleware = createPermissionMiddleware(mockRBAC);
      const requirePermission = middleware('users.read');

      await requirePermission(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('withRBAC', () => {
    const mockGetServerSession = jest.fn();
    const mockReq = {};
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const mockHandler = jest.fn();

    beforeEach(() => {
      jest.doMock('next-auth/next', () => ({
        getServerSession: mockGetServerSession
      }));
    });

    it('should create protected handler for single permission', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      mockRBAC.hasPermission.mockResolvedValue({ allowed: true });

      const withProtection = withRBAC(mockRBAC);
      const protectedHandler = withProtection('users.read', mockHandler);

      await protectedHandler(mockReq, mockRes);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes, {
        user: { id: 'user-123' }
      });
    });

    it('should create protected handler for multiple permissions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      mockRBAC.hasPermission.mockResolvedValue({ allowed: true });

      const withProtection = withRBAC(mockRBAC);
      const protectedHandler = withProtection(['users.read', 'users.write'], mockHandler);

      await protectedHandler(mockReq, mockRes);

      expect(mockRBAC.hasPermission).toHaveBeenCalledTimes(2);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should return 403 with required permission on denial', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      mockRBAC.hasPermission.mockResolvedValue({ allowed: false });

      const withProtection = withRBAC(mockRBAC);
      const protectedHandler = withProtection('users.read', mockHandler);

      await protectedHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        requiredPermission: 'users.read'
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('syncUserWithGatekeeper', () => {
    it('should create new user when not exists', async () => {
      const nextAuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg'
      };

      mockRBAC.connector.getUser.mockResolvedValue(null);
      mockRBAC.connector.createUser.mockResolvedValue({});

      await syncUserWithGatekeeper(mockRBAC, nextAuthUser);

      expect(mockRBAC.connector.createUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          image: 'https://example.com/avatar.jpg'
        }
      });
    });

    it('should update existing user', async () => {
      const nextAuthUser = {
        id: 'user-123',
        email: 'updated@example.com',
        name: 'Updated User'
      };

      const existingUser = {
        id: 'user-123',
        email: 'old@example.com',
        name: 'Old User',
        metadata: { oldData: 'preserved' }
      };

      mockRBAC.connector.getUser.mockResolvedValue(existingUser);
      mockRBAC.connector.updateUser.mockResolvedValue({});

      await syncUserWithGatekeeper(mockRBAC, nextAuthUser);

      expect(mockRBAC.connector.updateUser).toHaveBeenCalledWith('user-123', {
        email: 'updated@example.com',
        name: 'Updated User',
        metadata: {
          oldData: 'preserved',
          image: undefined
        }
      });
    });

    it('should handle sync errors gracefully', async () => {
      const nextAuthUser = { id: 'user-123' };
      mockRBAC.connector.getUser.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await syncUserWithGatekeeper(mockRBAC, nextAuthUser);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error syncing user with Gatekeeper:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle users without email', async () => {
      const nextAuthUser = {
        id: 'user-123',
        name: 'Test User'
      };

      mockRBAC.connector.getUser.mockResolvedValue(null);
      mockRBAC.connector.createUser.mockResolvedValue({});

      await syncUserWithGatekeeper(mockRBAC, nextAuthUser);

      expect(mockRBAC.connector.createUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: undefined,
        name: 'Test User',
        metadata: {
          image: undefined
        }
      });
    });
  });
});