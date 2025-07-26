/**
 * Additional Firebase connector tests to achieve 100% coverage
 */

import { FirebaseConnector } from '../firebase';

// Mock Firestore with more detailed methods
const mockFirestore = {
  collection: jest.fn(),
};

const mockCollection = {
  doc: jest.fn(),
  get: jest.fn(),
};

const mockDoc = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  exists: false,
  data: jest.fn(),
  id: ''
};

describe('FirebaseConnector - Coverage Tests', () => {
  let connector: FirebaseConnector;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    
    connector = new FirebaseConnector(mockFirestore as any);
  });

  describe('Error handling scenarios', () => {
    it('should handle updateUser error when user not found after update', async () => {
      mockDoc.update.mockResolvedValue(undefined);
      jest.spyOn(connector, 'getUser').mockResolvedValue(null);

      await expect(connector.updateUser('user-123', { name: 'Updated' }))
        .rejects.toThrow('User not found after update');
    });

    it('should handle updateRole error when role not found after update', async () => {
      mockDoc.update.mockResolvedValue(undefined);
      jest.spyOn(connector, 'getRole').mockResolvedValue(null);

      await expect(connector.updateRole('role-123', { name: 'Updated' }))
        .rejects.toThrow('Role not found after update');
    });

    it('should handle updateGroup error when group not found after update', async () => {
      mockDoc.update.mockResolvedValue(undefined);
      jest.spyOn(connector, 'getGroup').mockResolvedValue(null);

      await expect(connector.updateGroup('group-123', { name: 'Updated' }))
        .rejects.toThrow('Group not found after update');
    });

    it('should handle updateUserAssignment error when assignment not found after update', async () => {
      mockDoc.update.mockResolvedValue(undefined);
      jest.spyOn(connector, 'getUserAssignment').mockResolvedValue(null);

      await expect(connector.updateUserAssignment('user-123', { roleIds: ['new-role'] }))
        .rejects.toThrow('User assignment not found after update');
    });

    it('should handle updateTemplate error when template not found after update', async () => {
      mockDoc.update.mockResolvedValue(undefined);
      jest.spyOn(connector, 'getTemplate').mockResolvedValue(null);

      await expect(connector.updateTemplate('template-123', { name: 'Updated' }))
        .rejects.toThrow('Template not found after update');
    });

    it('should handle createUser error', async () => {
      mockDoc.set.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.createUser({
        id: 'user-123',
        name: 'Test User'
      })).rejects.toThrow('Failed to create user');
    });

    it('should handle createRole error', async () => {
      mockDoc.set.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.createRole({
        id: 'role-123',
        name: 'Test Role',
        permissions: []
      })).rejects.toThrow('Failed to create role');
    });

    it('should handle createGroup error', async () => {
      mockDoc.set.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.createGroup({
        id: 'group-123',
        name: 'Test Group',
        members: [],
        permissions: []
      })).rejects.toThrow('Failed to create group');
    });

    it('should handle createUserAssignment error', async () => {
      mockDoc.set.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.createUserAssignment({
        userId: 'user-123',
        roleIds: [],
        groupIds: []
      })).rejects.toThrow('Failed to create user assignment');
    });

    it('should handle createTemplate error', async () => {
      mockDoc.set.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.createTemplate({
        id: 'template-123',
        name: 'Test Template',
        permissions: []
      })).rejects.toThrow('Failed to create template');
    });

    it('should handle updateUser error', async () => {
      mockDoc.update.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.updateUser('user-123', { name: 'Updated' }))
        .rejects.toThrow('Failed to update user');
    });

    it('should handle updateRole error', async () => {
      mockDoc.update.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.updateRole('role-123', { name: 'Updated' }))
        .rejects.toThrow('Failed to update role');
    });

    it('should handle updateGroup error', async () => {
      mockDoc.update.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.updateGroup('group-123', { name: 'Updated' }))
        .rejects.toThrow('Failed to update group');
    });

    it('should handle updateUserAssignment error', async () => {
      mockDoc.update.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.updateUserAssignment('user-123', { roleIds: ['new-role'] }))
        .rejects.toThrow('Failed to update user assignment');
    });

    it('should handle updateTemplate error', async () => {
      mockDoc.update.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.updateTemplate('template-123', { name: 'Updated' }))
        .rejects.toThrow('Failed to update template');
    });

    it('should handle deleteUser error', async () => {
      mockDoc.delete.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.deleteUser('user-123'))
        .rejects.toThrow('Failed to delete user');
    });

    it('should handle deleteRole error', async () => {
      mockDoc.delete.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.deleteRole('role-123'))
        .rejects.toThrow('Failed to delete role');
    });

    it('should handle deleteGroup error', async () => {
      mockDoc.delete.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.deleteGroup('group-123'))
        .rejects.toThrow('Failed to delete group');
    });

    it('should handle deleteUserAssignment error', async () => {
      mockDoc.delete.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.deleteUserAssignment('user-123'))
        .rejects.toThrow('Failed to delete user assignment');
    });

    it('should handle deleteTemplate error', async () => {
      mockDoc.delete.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.deleteTemplate('template-123'))
        .rejects.toThrow('Failed to delete template');
    });

    it('should handle getUser error', async () => {
      mockDoc.get.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.getUser('user-123'))
        .rejects.toThrow('Failed to get user');
    });

    it('should handle getRole error', async () => {
      mockDoc.get.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.getRole('role-123'))
        .rejects.toThrow('Failed to get role');
    });

    it('should handle getGroup error', async () => {
      mockDoc.get.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.getGroup('group-123'))
        .rejects.toThrow('Failed to get group');
    });

    it('should handle getUserAssignment error', async () => {
      mockDoc.get.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.getUserAssignment('user-123'))
        .rejects.toThrow('Failed to get user assignment');
    });

    it('should handle getTemplate error', async () => {
      mockDoc.get.mockRejectedValue(new Error('Firestore error'));

      await expect(connector.getTemplate('template-123'))
        .rejects.toThrow('Failed to get template');
    });

    it('should handle getGroupsByUserId error', async () => {
      jest.spyOn(connector, 'getUserAssignment').mockRejectedValue(new Error('DB error'));

      await expect(connector.getGroupsByUserId('user-123'))
        .rejects.toThrow('Failed to get groups for user');
    });
  });
});