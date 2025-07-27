/**
 * Complete coverage tests for Firebase connector edge cases
 */

import { createFirebaseConnector } from '../firebase';

// Mock Firestore
const mockDoc = {
  id: 'test-id',
  data: jest.fn(),
  exists: true,
  get: jest.fn()
};

const mockCollection = {
  doc: jest.fn(() => mockDoc),
  add: jest.fn(),
  where: jest.fn(() => ({
    get: jest.fn(() => ({ empty: true, docs: [] }))
  }))
};

const mockDb = {
  collection: jest.fn(() => mockCollection),
  doc: jest.fn(() => mockDoc)
} as any;

describe('Firebase Connector Complete Coverage', () => {
  let connector: any;

  beforeEach(() => {
    jest.clearAllMocks();
    connector = createFirebaseConnector(mockDb);
    
    // Setup default mock implementations
    mockDoc.data.mockReturnValue({
      name: 'Test',
      permissions: ['read']
    });
    
    const mockGet = jest.fn(() => Promise.resolve(mockDoc));
    mockDoc.get = mockGet;
  });

  describe('Group timestamp fallbacks (lines 146-147)', () => {
    it('should use fallback dates when createdAt is null', async () => {
      // Mock group data with null createdAt
      mockDoc.data.mockReturnValue({
        name: 'Test Group',
        permissions: ['read'],
        createdAt: null, // This will trigger the fallback
        updatedAt: { toDate: () => new Date('2023-01-01') }
      });

      const result = await connector.getGroup('group-id');
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toEqual(new Date('2023-01-01'));
    });

    it('should use fallback dates when updatedAt is null', async () => {
      // Mock group data with null updatedAt
      mockDoc.data.mockReturnValue({
        name: 'Test Group',
        permissions: ['read'],
        createdAt: { toDate: () => new Date('2023-01-01') },
        updatedAt: null // This will trigger the fallback
      });

      const result = await connector.getGroup('group-id');
      
      expect(result.createdAt).toEqual(new Date('2023-01-01'));
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should use fallback dates when both timestamps are null', async () => {
      // Mock group data with both null timestamps
      mockDoc.data.mockReturnValue({
        name: 'Test Group',
        permissions: ['read'],
        createdAt: null,
        updatedAt: null
      });

      const result = await connector.getGroup('group-id');
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Role timestamp fallbacks (lines 245-246)', () => {
    it('should use fallback dates when role createdAt is null', async () => {
      // Mock role data with null createdAt
      mockDoc.data.mockReturnValue({
        name: 'Test Role',
        permissions: ['write'],
        createdAt: null, // This will trigger the fallback
        updatedAt: { toDate: () => new Date('2023-01-01') }
      });

      const result = await connector.getRole('role-id');
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toEqual(new Date('2023-01-01'));
    });

    it('should use fallback dates when role updatedAt is null', async () => {
      // Mock role data with null updatedAt  
      mockDoc.data.mockReturnValue({
        name: 'Test Role',
        permissions: ['write'],
        createdAt: { toDate: () => new Date('2023-01-01') },
        updatedAt: null // This will trigger the fallback
      });

      const result = await connector.getRole('role-id');
      
      expect(result.createdAt).toEqual(new Date('2023-01-01'));
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('User timestamp fallbacks (lines 323-324)', () => {
    it('should use fallback dates when user timestamps are null', async () => {
      // Mock user data with null timestamps
      mockDoc.data.mockReturnValue({
        name: 'Test User',
        email: 'test@example.com',
        createdAt: null,
        updatedAt: null
      });

      const result = await connector.getUser('user-id');
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('User Assignment timestamp fallbacks (lines 406-407)', () => {
    it('should use fallback dates when user assignment timestamps are null', async () => {
      // Mock user assignment data with null timestamps
      mockDoc.data.mockReturnValue({
        userId: 'user-123',
        roleIds: ['role-1'],
        groupIds: ['group-1'],
        directPermissions: ['perm-1'],
        createdAt: null,
        updatedAt: null
      });

      const result = await connector.getUserAssignment('user-123');
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle mixed null timestamps in user assignment', async () => {
      // Mock user assignment with one null timestamp
      mockDoc.data.mockReturnValue({
        userId: 'user-123',
        roleIds: ['role-1'],
        groupIds: ['group-1'],
        directPermissions: ['perm-1'],
        createdAt: { toDate: () => new Date('2023-01-01') },
        updatedAt: null // Only this one is null
      });

      const result = await connector.getUserAssignment('user-123');
      
      expect(result.createdAt).toEqual(new Date('2023-01-01'));
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });
}); 