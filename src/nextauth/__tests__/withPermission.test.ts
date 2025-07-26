/**
 * Tests for withPermission HOC to improve coverage
 */

import { withPermission } from '../index';

// Mock React
const mockReact = {
  createElement: jest.fn()
};
jest.mock('react', () => mockReact);

// Mock next-auth/react
const mockUseSession = jest.fn();
jest.mock('next-auth/react', () => ({
  useSession: mockUseSession
}));

// Mock next/router
const mockUseRouter = jest.fn();
jest.mock('next/router', () => ({
  useRouter: mockUseRouter
}));

describe('withPermission HOC', () => {
  const MockComponent = () => null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReact.createElement.mockImplementation((component, props) => ({ component, props }));
  });

  it('should show loading state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading'
    });

    const ProtectedComponent = withPermission(MockComponent, 'users.read');
    const result = ProtectedComponent({ testProp: 'value' });

    expect(mockReact.createElement).toHaveBeenCalledWith('div', null, 'Loading...');
  });

  it('should show fallback when loading and fallback provided', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading'
    });

    const FallbackComponent = () => null;
    const ProtectedComponent = withPermission(MockComponent, 'users.read', {
      fallback: FallbackComponent
    });
    
    const result = ProtectedComponent({ testProp: 'value' });

    expect(mockReact.createElement).toHaveBeenCalledWith(FallbackComponent);
  });

  it('should redirect when unauthenticated and redirectTo provided', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockReturnValue({ push: mockPush });
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    const ProtectedComponent = withPermission(MockComponent, 'users.read', {
      redirectTo: '/login'
    });
    
    const result = ProtectedComponent({ testProp: 'value' });

    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(result).toBeNull();
  });

  it('should show access denied when unauthenticated and no redirect', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    const ProtectedComponent = withPermission(MockComponent, 'users.read');
    const result = ProtectedComponent({ testProp: 'value' });

    expect(mockReact.createElement).toHaveBeenCalledWith('div', null, 'Access Denied');
  });

  it('should show fallback when unauthenticated and fallback provided', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    const FallbackComponent = () => null;
    const ProtectedComponent = withPermission(MockComponent, 'users.read', {
      fallback: FallbackComponent
    });
    
    const result = ProtectedComponent({ testProp: 'value' });

    expect(mockReact.createElement).toHaveBeenCalledWith(FallbackComponent);
  });

  it('should show access denied when permission not granted', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-123' },
        permissions: ['posts.read'],
        expires: '2024-12-31'
      },
      status: 'authenticated'
    });

    const ProtectedComponent = withPermission(MockComponent, 'users.read');
    const result = ProtectedComponent({ testProp: 'value' });

    expect(mockReact.createElement).toHaveBeenCalledWith('div', null, 'Access Denied');
  });

  it('should render component when permission granted', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-123' },
        permissions: ['users.read'],
        expires: '2024-12-31'
      },
      status: 'authenticated'
    });

    const ProtectedComponent = withPermission(MockComponent, 'users.read');
    const result = ProtectedComponent({ testProp: 'value' });

    expect(mockReact.createElement).toHaveBeenCalledWith(MockComponent, { testProp: 'value' });
  });

  it('should handle missing permissions array', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-123' },
        expires: '2024-12-31'
      },
      status: 'authenticated'
    });

    const ProtectedComponent = withPermission(MockComponent, 'users.read');
    const result = ProtectedComponent({ testProp: 'value' });

    expect(mockReact.createElement).toHaveBeenCalledWith('div', null, 'Access Denied');
  });
});