import { createNextjsMiddleware, getServerPermissions, getServerSidePermissions, withPermissions, requireAuth } from '../index';

// Mock NextAuth modules
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}));

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn(),
    next: jest.fn()
  }
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn()
}));

jest.mock('react', () => ({
  createElement: jest.fn((type, props, ...children) => ({ type, props, children }))
}));

// Mock RBAC
const mockRbac = {
  hasPermission: jest.fn(),
  getUserEffectivePermissions: jest.fn(),
  getUserRoles: jest.fn()
};

// Mock connector
const mockConnector = {
  getUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn()
};

describe('NextAuth Utilities', () => {
  const mockRequest = {} as any;
  const mockContext = { req: {}, res: {}, query: {}, resolvedUrl: '/test' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up global mocks
    (global as any).process = { env: { NEXTAUTH_SECRET: 'test-secret' } };
    (global as any).Headers = class {
      private headers = new Map();
      set(name: string, value: string) { this.headers.set(name, value); }
      get(name: string) { return this.headers.get(name); }
    };
    (global as any).URL = class {
      constructor(public href: string, base?: string) {
        this.href = base ? `${base}${href}` : href;
      }
      searchParams = {
        set: jest.fn()
      };
    };
    (global as any).Response = class {
      constructor(public body: string, public init: any) {}
      static json(data: any) {
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      }
    };
  });

  describe('createNextjsMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createNextjsMiddleware(mockRbac as any);
      expect(typeof middleware).toBe('function');
    });

    it('should redirect to signin when no token', async () => {
      const { getToken } = require('next-auth/jwt');
      const { NextResponse } = require('next/server');
      
      getToken.mockResolvedValue(null);
      NextResponse.redirect.mockReturnValue('redirect-response');

      const middleware = createNextjsMiddleware(mockRbac as any);
      const request = { 
        url: 'https://example.com/protected',
        headers: new Headers()
      } as any; // Type assertion for test mock

      const result = await middleware(request);
      
      expect(getToken).toHaveBeenCalledWith({
        req: request,
        secret: 'test-secret'
      });
      expect(NextResponse.redirect).toHaveBeenCalled();
    });

    it('should proceed with valid token', async () => {
      const { getToken } = require('next-auth/jwt');
      const { NextResponse } = require('next/server');
      
      getToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        permissions: ['read'],
        roles: ['user']
      });
      NextResponse.next.mockReturnValue('next-response');

      const middleware = createNextjsMiddleware(mockRbac as any);
      const request = { 
        url: 'https://example.com/protected',
        headers: new Headers()
      } as any; // Type assertion for test mock

      const result = await middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalledWith({
        request: {
          headers: expect.any(Headers)
        }
      });
    });

    it('should handle middleware errors', async () => {
      const { getToken } = require('next-auth/jwt');
      const { NextResponse } = require('next/server');
      
      getToken.mockRejectedValue(new Error('Token error'));
      NextResponse.redirect.mockReturnValue('error-redirect');

      const middleware = createNextjsMiddleware(mockRbac as any);
      const request = { 
        url: 'https://example.com/protected',
        headers: new Headers()
      } as any; // Type assertion for test mock

      const result = await middleware(request);
      
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({ href: expect.stringContaining('/api/auth/signin') })
      );
    });
  });

  describe('getServerPermissions', () => {
    it('should return permissions for authenticated user', async () => {
      const { getServerSession } = require('next-auth/next');
      
      getServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      
      mockRbac.getUserEffectivePermissions.mockResolvedValue([
        { permission: 'read' },
        { permission: 'write' }
      ]);
      
      mockRbac.getUserRoles.mockResolvedValue([
        { id: 'role-1', name: 'admin' }
      ]);

      const result = await getServerPermissions(mockRbac as any);
      
      expect(result.isAuthenticated).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.permissions).toEqual(['read', 'write']);
      expect(result.roles).toEqual(['admin']);
      expect(result.hasPermission('read')).toBe(true);
      expect(result.hasPermission('delete')).toBe(false);
      expect(result.hasRole('admin')).toBe(true);
      expect(result.hasRole('user')).toBe(false);
    });

    it('should return unauthenticated state when no session', async () => {
      const { getServerSession } = require('next-auth/next');
      
      getServerSession.mockResolvedValue(null);

      const result = await getServerPermissions(mockRbac as any);
      
      expect(result.isAuthenticated).toBe(false);
      expect(result.userId).toBe(null);
      expect(result.permissions).toEqual([]);
      expect(result.roles).toEqual([]);
      expect(result.hasPermission('read')).toBe(false);
      expect(result.hasRole('admin')).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const { getServerSession } = require('next-auth/next');
      
      getServerSession.mockRejectedValue(new Error('Session error'));

      const result = await getServerPermissions(mockRbac as any);
      
      expect(result.isAuthenticated).toBe(false);
      expect(result.userId).toBe(null);
      expect(result.hasPermission('test')).toBe(false);
      expect(result.hasRole('test')).toBe(false);
      expect(result.permissions).toEqual([]);
      expect(result.roles).toEqual([]);
    });
  });

  describe('getServerSidePermissions', () => {
    it('should return permissions for authenticated user', async () => {
      const { getServerSession } = require('next-auth/next');
      
      const context = { 
        req: {}, 
        res: {}, 
        query: {}, 
        resolvedUrl: '/test' 
      } as any;
      
      getServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      
      mockRbac.getUserEffectivePermissions.mockResolvedValue([
        { permission: 'read' }
      ]);
      
      mockRbac.getUserRoles.mockResolvedValue([
        { id: 'role-1', name: 'admin' }
      ]);

      const result = await getServerSidePermissions(context, mockRbac as any);
      
      expect(result.isAuthenticated).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.permissions).toEqual(['read']);
      expect(result.roles).toEqual([{ id: 'role-1', name: 'admin' }]);
    });

    it('should return redirect for unauthenticated user', async () => {
      const { getServerSession } = require('next-auth/next');
      
      getServerSession.mockResolvedValue(null);

      const result = await getServerSidePermissions(mockContext, mockRbac as any);
      
      expect(result.isAuthenticated).toBe(false);
      expect(result.redirect).toEqual({
        destination: '/api/auth/signin',
        permanent: false
      });
    });

    it('should handle errors gracefully', async () => {
      const { getServerSession } = require('next-auth/next');
      
      const context = { 
        req: {}, 
        res: {}, 
        query: {}, 
        resolvedUrl: '/test' 
      } as any;
      
      getServerSession.mockRejectedValue(new Error('Session error'));

      const result = await getServerSidePermissions(context, mockRbac as any);
      
      expect(result.isAuthenticated).toBe(false);
      expect(result.userId).toBe(null);
    });
  });

  describe('withPermissions', () => {
    it('should protect route with required permission', async () => {
      const { getServerSession } = require('next-auth/next');
      
      getServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      
      mockRbac.hasPermission.mockResolvedValue({ allowed: true });

      const handler = jest.fn().mockResolvedValue('success');
      const protectedHandler = withPermissions(mockRbac as any, 'read')(handler);
      
      const request = {};
      const context = {};
      
      const result = await protectedHandler(mockRequest, context);
      
      expect(handler).toHaveBeenCalledWith(request, {
        ...context,
        session: { user: { id: 'user-123' } }
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      const { getServerSession } = require('next-auth/next');
      
      getServerSession.mockResolvedValue(null);

      const handler = jest.fn();
      const protectedHandler = withPermissions(mockRbac as any, 'read')(handler);
      
      const result = await protectedHandler({}, {});
      
      expect(result).toBeInstanceOf(Response);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 403 for insufficient permissions', async () => {
      const { getServerSession } = require('next-auth/next');
      
      getServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      
      mockRbac.hasPermission.mockResolvedValue({ allowed: false });

      const handler = jest.fn();
      const protectedHandler = withPermissions(mockRbac as any, 'write')(handler);
      
      const result = await protectedHandler({}, {});
      
      expect(result).toBeInstanceOf(Response);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple permissions', async () => {
      const { getServerSession } = require('next-auth/next');
      
      getServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      });
      
      mockRbac.hasPermission
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: true });

      const handler = jest.fn().mockResolvedValue('success');
      const protectedHandler = withPermissions(mockRbac as any, ['read', 'write'])(handler);
      
      const result = await protectedHandler({}, {});
      
      expect(mockRbac.hasPermission).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const { getServerSession } = require('next-auth/next');
      
      getServerSession.mockRejectedValue(new Error('Session error'));

      const handler = jest.fn();
      const protectedHandler = withPermissions(mockRbac as any, 'read')(handler);
      
      const result = await protectedHandler({}, {});
      
      expect(result).toBeInstanceOf(Response);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should create a protected component function', () => {
      const { requireAuth } = require('../index');
      const TestComponent = () => 'test component';
      
      const ProtectedComponent = requireAuth(mockRbac as any, {
        permissions: ['read'],
        roles: ['admin']
      })(TestComponent);
      
      expect(typeof ProtectedComponent).toBe('function');
    });

    it('should handle basic requireAuth functionality', () => {
      const { requireAuth } = require('../index');
      expect(typeof requireAuth).toBe('function');
      
      const TestComponent = () => 'test';
      const ProtectedComponent = requireAuth(mockRbac as any)(TestComponent);
      expect(typeof ProtectedComponent).toBe('function');
    });
  });
});