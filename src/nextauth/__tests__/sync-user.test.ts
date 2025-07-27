import { syncUserWithGatekeeper } from '../index';

describe('syncUserWithGatekeeper', () => {
  let mockRbac: any;
  let mockConnector: any;

  beforeEach(() => {
    mockConnector = {
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn()
    };

    mockRbac = {
      connector: mockConnector
    };

    // Clear mocks
    jest.clearAllMocks();
  });

  it('should create new user when user does not exist', async () => {
    const nextAuthUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg'
    };

    mockConnector.getUser.mockResolvedValue(null);
    mockConnector.createUser.mockResolvedValue(undefined);

    await syncUserWithGatekeeper(mockRbac, nextAuthUser);

    expect(mockConnector.getUser).toHaveBeenCalledWith('user-123');
    expect(mockConnector.createUser).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      metadata: {
        image: 'https://example.com/avatar.jpg'
      }
    });
    expect(mockConnector.updateUser).not.toHaveBeenCalled();
  });

  it('should update existing user when user exists', async () => {
    const nextAuthUser = {
      id: 'user-123',
      email: 'updated@example.com',
      name: 'Updated User',
      image: 'https://example.com/new-avatar.jpg'
    };

    const existingUser = {
      id: 'user-123',
      email: 'old@example.com',
      name: 'Old User',
      metadata: {
        oldField: 'old-value'
      }
    };

    mockConnector.getUser.mockResolvedValue(existingUser);
    mockConnector.updateUser.mockResolvedValue(undefined);

    await syncUserWithGatekeeper(mockRbac, nextAuthUser);

    expect(mockConnector.getUser).toHaveBeenCalledWith('user-123');
    expect(mockConnector.updateUser).toHaveBeenCalledWith('user-123', {
      email: 'updated@example.com',
      name: 'Updated User',
      metadata: {
        oldField: 'old-value',
        image: 'https://example.com/new-avatar.jpg'
      }
    });
    expect(mockConnector.createUser).not.toHaveBeenCalled();
  });

  it('should handle user with minimal data', async () => {
    const nextAuthUser = {
      id: 'user-456'
      // No email, name, or image
    };

    mockConnector.getUser.mockResolvedValue(null);
    mockConnector.createUser.mockResolvedValue(undefined);

    await syncUserWithGatekeeper(mockRbac, nextAuthUser);

    expect(mockConnector.createUser).toHaveBeenCalledWith({
      id: 'user-456',
      email: undefined,
      name: undefined,
      metadata: {
        image: undefined
      }
    });
  });

  it('should preserve existing user data when NextAuth data is missing', async () => {
    const nextAuthUser = {
      id: 'user-123'
      // No email or name
    };

    const existingUser = {
      id: 'user-123',
      email: 'existing@example.com',
      name: 'Existing User',
      metadata: {
        existingField: 'existing-value'
      }
    };

    mockConnector.getUser.mockResolvedValue(existingUser);
    mockConnector.updateUser.mockResolvedValue(undefined);

    await syncUserWithGatekeeper(mockRbac, nextAuthUser);

    expect(mockConnector.updateUser).toHaveBeenCalledWith('user-123', {
      email: 'existing@example.com', // Preserved from existing user
      name: 'Existing User', // Preserved from existing user
      metadata: {
        existingField: 'existing-value',
        image: undefined
      }
    });
  });

  it('should handle getUser errors gracefully', async () => {
    const nextAuthUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    mockConnector.getUser.mockRejectedValue(new Error('Database error'));

    // Should not throw
    await expect(syncUserWithGatekeeper(mockRbac, nextAuthUser)).resolves.toBeUndefined();

    expect(mockConnector.getUser).toHaveBeenCalledWith('user-123');
    expect(mockConnector.createUser).not.toHaveBeenCalled();
    expect(mockConnector.updateUser).not.toHaveBeenCalled();
  });

  it('should handle createUser errors gracefully', async () => {
    const nextAuthUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    mockConnector.getUser.mockResolvedValue(null);
    mockConnector.createUser.mockRejectedValue(new Error('Create error'));

    // Should not throw
    await expect(syncUserWithGatekeeper(mockRbac, nextAuthUser)).resolves.toBeUndefined();

    expect(mockConnector.getUser).toHaveBeenCalledWith('user-123');
    expect(mockConnector.createUser).toHaveBeenCalled();
  });

  it('should handle updateUser errors gracefully', async () => {
    const nextAuthUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    const existingUser = {
      id: 'user-123',
      email: 'old@example.com',
      name: 'Old User',
      metadata: {}
    };

    mockConnector.getUser.mockResolvedValue(existingUser);
    mockConnector.updateUser.mockRejectedValue(new Error('Update error'));

    // Should not throw
    await expect(syncUserWithGatekeeper(mockRbac, nextAuthUser)).resolves.toBeUndefined();

    expect(mockConnector.getUser).toHaveBeenCalledWith('user-123');
    expect(mockConnector.updateUser).toHaveBeenCalled();
  });

  it('should handle AdapterUser type', async () => {
    const adapterUser = {
      id: 'user-123',
      email: 'adapter@example.com',
      emailVerified: new Date(),
      // AdapterUser specific fields
    };

    mockConnector.getUser.mockResolvedValue(null);
    mockConnector.createUser.mockResolvedValue(undefined);

    await syncUserWithGatekeeper(mockRbac, adapterUser);

    expect(mockConnector.createUser).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'adapter@example.com',
      name: undefined,
      metadata: {
        image: undefined
      }
    });
  });
});