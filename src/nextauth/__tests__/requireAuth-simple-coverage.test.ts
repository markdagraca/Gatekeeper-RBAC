/**
 * Simple direct tests to cover specific uncovered lines in requireAuth
 */

describe('requireAuth - Direct Line Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should cover window undefined check (line 526)', async () => {
    // Mock next-auth/react
    const mockUseSession = jest.fn().mockReturnValue({
      data: null, 
      status: 'unauthenticated'
    });

    jest.doMock('next-auth/react', () => ({
      useSession: mockUseSession,
      signIn: jest.fn()
    }));

    // Mock useGatekeeperPermissions
    const mockUseGatekeeperPermissions = jest.fn().mockReturnValue({
      hasPermission: jest.fn(),
      hasRole: jest.fn()
    });

    jest.doMock('../index', () => {
      const actual = jest.requireActual('../index');
      return {
        ...actual,
        useGatekeeperPermissions: mockUseGatekeeperPermissions
      };
    });

    // Ensure window is undefined for server-side scenario
    const originalWindow = global.window;
    delete (global as any).window;

    try {
      const { requireAuth } = require('../index');
      const mockRBAC = {} as any;
      const TestComponent = () => 'test';
      
      const ProtectedComponent = requireAuth(mockRBAC)(TestComponent);
      const result = ProtectedComponent({});

      // Should have called the window check and not thrown error
      expect(result).toBeDefined();
      expect(result.type).toBe('div');
    } finally {
      // Restore window
      (global as any).window = originalWindow;
    }
  });

  it('should cover role failure path (lines 540-547)', async () => {
    // Mock React.createElement
    jest.doMock('react', () => ({
      createElement: jest.fn().mockImplementation((type, props, ...children) => ({ type, props, children }))
    }));

    // Mock next-auth/react
    const mockUseSession = jest.fn().mockReturnValue({
      data: { user: { id: 'user-123' } },
      status: 'authenticated'
    });

    jest.doMock('next-auth/react', () => ({
      useSession: mockUseSession,
      signIn: jest.fn()
    }));

    // Mock useGatekeeperPermissions to return failing role check
    const mockUseGatekeeperPermissions = jest.fn().mockReturnValue({
      hasPermission: jest.fn().mockReturnValue(true), // Pass permissions
      hasRole: jest.fn().mockReturnValue(false) // Fail roles
    });

    jest.doMock('../index', () => {
      const actual = jest.requireActual('../index');
      return {
        ...actual,
        useGatekeeperPermissions: mockUseGatekeeperPermissions
      };
    });

    const { requireAuth } = require('../index');
    const mockRBAC = {} as any;
    const TestComponent = () => 'test';
    
    // Test with roles required but user has none
    const ProtectedComponent = requireAuth(mockRBAC, {
      roles: ['admin'] // User needs admin role but doesn't have it
    })(TestComponent);
    
    const result = ProtectedComponent({});

    // Should fail on role check
    expect(result.type).toBe('div');
    expect(result.children).toEqual(['Access Denied: Insufficient role']);
  });

  it('should cover successful component render (line 547)', async () => {
    // Mock next-auth/react
    const mockUseSession = jest.fn().mockReturnValue({
      data: { user: { id: 'user-123' } },
      status: 'authenticated'
    });

    jest.doMock('next-auth/react', () => ({
      useSession: mockUseSession,
      signIn: jest.fn()
    }));

    // Mock useGatekeeperPermissions to pass all checks
    const mockUseGatekeeperPermissions = jest.fn().mockReturnValue({
      hasPermission: jest.fn().mockReturnValue(true),
      hasRole: jest.fn().mockReturnValue(true)
    });

    jest.doMock('../index', () => {
      const actual = jest.requireActual('../index');
      return {
        ...actual,
        useGatekeeperPermissions: mockUseGatekeeperPermissions
      };
    });

    const { requireAuth } = require('../index');
    const mockRBAC = {} as any;
    const TestComponent = jest.fn().mockReturnValue('rendered');
    
    // Test with no restrictions - should render successfully
    const ProtectedComponent = requireAuth(mockRBAC)(TestComponent);
    const result = ProtectedComponent({ prop: 'value' });

    // Should render the component successfully (covers line 547)
    expect(result.type).toBe(TestComponent);
    expect(result.props).toEqual({ prop: 'value' });
  });

  it('should cover React fallback createElement (lines 558-559)', () => {
    // Mock react to throw an error when required
    jest.doMock('react', () => {
      throw new Error('React not available');
    });

    try {
      // Clear module cache to force re-evaluation with React error
      delete require.cache[require.resolve('../index')];
      
      // This will trigger the React fallback code
      const indexModule = require('../index');
      
      // The module should still work even without React
      expect(typeof indexModule.requireAuth).toBe('function');
      
      // Test that the fallback React object was created
      // The fallback should have a createElement function
      const mockUseSession = jest.fn().mockReturnValue({
        data: null,
        status: 'loading'
      });

      jest.doMock('next-auth/react', () => ({
        useSession: mockUseSession,
        signIn: jest.fn()
      }));

      jest.doMock('../index', () => {
        const actual = jest.requireActual('../index');
        return {
          ...actual,
          useGatekeeperPermissions: jest.fn().mockReturnValue({
            hasPermission: jest.fn(),
            hasRole: jest.fn()
          })
        };
      });

      // Use the requireAuth function which should use fallback React
      const { requireAuth } = indexModule;
      const mockRBAC = {} as any;
      const TestComponent = () => 'test';
      
      const ProtectedComponent = requireAuth(mockRBAC)(TestComponent);
      const result = ProtectedComponent({});

      // Should still return a valid object structure
      expect(result).toHaveProperty('type');
      
    } finally {
      // Restore React mock
      jest.dontMock('react');
      delete require.cache[require.resolve('../index')];
    }
  });
}); 