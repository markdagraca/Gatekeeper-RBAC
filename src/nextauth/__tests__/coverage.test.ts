/**
 * Additional NextAuth tests to achieve 100% coverage
 */

import { syncUserWithGatekeeper } from '../index';

describe('NextAuth - Coverage Tests', () => {
  const mockRBAC = {
    connector: {
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn()
    }
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle syncUserWithGatekeeper with missing metadata', async () => {
    const nextAuthUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
      // No image property
    };

    const existingUser = {
      id: 'user-123',
      email: 'old@example.com',
      name: 'Old User',
      metadata: { existingData: 'preserved' }
    };

    mockRBAC.connector.getUser.mockResolvedValue(existingUser);
    mockRBAC.connector.updateUser.mockResolvedValue({});

    await syncUserWithGatekeeper(mockRBAC, nextAuthUser);

    expect(mockRBAC.connector.updateUser).toHaveBeenCalledWith('user-123', {
      email: 'test@example.com',
      name: 'Test User',
      metadata: {
        existingData: 'preserved',
        image: undefined
      }
    });
  });

  it('should handle createUser path with undefined email and name', async () => {
    const nextAuthUser = {
      id: 'user-123'
      // No email or name
    };

    mockRBAC.connector.getUser.mockResolvedValue(null);
    mockRBAC.connector.createUser.mockResolvedValue({});

    await syncUserWithGatekeeper(mockRBAC, nextAuthUser);

    expect(mockRBAC.connector.createUser).toHaveBeenCalledWith({
      id: 'user-123',
      email: undefined,
      name: undefined,
      metadata: {
        image: undefined
      }
    });
  });

  describe('withRBAC middleware coverage - line 248', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetModules();
    });

    it('should handle unauthorized access in withRBAC - line 248', async () => {
      // Mock getServerSession to return null (no session)
      jest.doMock('next-auth/next', () => ({
        getServerSession: jest.fn().mockResolvedValue(null)
      }));

      const { withRBAC } = require('../index');
      
      // Create the protected handler using withRBAC
      const createProtectedHandler = withRBAC(mockRBAC);
      const mockHandler = jest.fn();
      const protectedHandler = createProtectedHandler('test.permission', mockHandler);
      
      // Mock request and response objects
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Execute the protected handler
      await protectedHandler(mockReq, mockRes);

      // Verify unauthorized response (line 248)
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should handle session without user ID in withRBAC', async () => {
      // Mock getServerSession to return session without user ID
      jest.doMock('next-auth/next', () => ({
        getServerSession: jest.fn().mockResolvedValue({
          user: {} // No id property
        })
      }));

      const { withRBAC } = require('../index');
      
      const createProtectedHandler = withRBAC(mockRBAC);
      const mockHandler = jest.fn();
      const protectedHandler = createProtectedHandler('test.permission', mockHandler);
      
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await protectedHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});