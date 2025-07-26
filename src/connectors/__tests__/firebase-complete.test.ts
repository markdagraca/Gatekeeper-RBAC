/**
 * Complete Firebase connector tests to achieve 100% coverage
 * Targeting specific uncovered lines: 191, 290, 373, 456
 */

import { FirebaseConnector } from '../firebase';

// Mock Firestore
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

describe('FirebaseConnector - Complete Coverage', () => {
  let connector: FirebaseConnector;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    
    connector = new FirebaseConnector(mockFirestore as any);
  });

  describe('Update operations with successful return paths', () => {
    it('should successfully update group and return updated group', async () => {
      const groupId = 'group-123';
      const updates = { name: 'Updated Group' };
      const updatedGroup = {
        id: groupId,
        name: 'Updated Group',
        members: [],
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock successful update
      mockDoc.update.mockResolvedValue(undefined);
      
      // Mock successful getGroup call that returns the updated group (line 191)
      jest.spyOn(connector, 'getGroup').mockResolvedValue(updatedGroup);

      const result = await connector.updateGroup(groupId, updates);

      expect(result).toEqual(updatedGroup);
      expect(mockDoc.update).toHaveBeenCalled();
      expect(connector.getGroup).toHaveBeenCalledWith(groupId);
    });

    it('should successfully update role and return updated role', async () => {
      const roleId = 'role-123';
      const updates = { name: 'Updated Role' };
      const updatedRole = {
        id: roleId,
        name: 'Updated Role',
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock successful update
      mockDoc.update.mockResolvedValue(undefined);
      
      // Mock successful getRole call that returns the updated role (line 290)
      jest.spyOn(connector, 'getRole').mockResolvedValue(updatedRole);

      const result = await connector.updateRole(roleId, updates);

      expect(result).toEqual(updatedRole);
      expect(mockDoc.update).toHaveBeenCalled();
      expect(connector.getRole).toHaveBeenCalledWith(roleId);
    });

    it('should successfully update user assignment and return updated assignment', async () => {
      const userId = 'user-123';
      const updates = { roleIds: ['new-role'] };
      const updatedAssignment = {
        userId,
        roleIds: ['new-role'],
        groupIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock successful update
      mockDoc.update.mockResolvedValue(undefined);
      
      // Mock successful getUserAssignment call that returns the updated assignment (line 373)
      jest.spyOn(connector, 'getUserAssignment').mockResolvedValue(updatedAssignment);

      const result = await connector.updateUserAssignment(userId, updates);

      expect(result).toEqual(updatedAssignment);
      expect(mockDoc.update).toHaveBeenCalled();
      expect(connector.getUserAssignment).toHaveBeenCalledWith(userId);
    });

    it('should successfully update template and return updated template', async () => {
      const templateId = 'template-123';
      const updates = { name: 'Updated Template' };
      const updatedTemplate = {
        id: templateId,
        name: 'Updated Template',
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock successful update
      mockDoc.update.mockResolvedValue(undefined);
      
      // Mock successful getTemplate call that returns the updated template (line 456)
      jest.spyOn(connector, 'getTemplate').mockResolvedValue(updatedTemplate);

      const result = await connector.updateTemplate(templateId, updates);

      expect(result).toEqual(updatedTemplate);
      expect(mockDoc.update).toHaveBeenCalled();
      expect(connector.getTemplate).toHaveBeenCalledWith(templateId);
    });
  });

  describe('Error paths to ensure all catch blocks are covered', () => {
    it('should handle getGroupsByUserId with successful assignment but missing group', async () => {
      const userId = 'user-123';
      const assignment = {
        userId,
        roleIds: [],
        groupIds: ['missing-group'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock successful assignment fetch but null group
      jest.spyOn(connector, 'getUserAssignment').mockResolvedValue(assignment);
      jest.spyOn(connector, 'getGroup').mockResolvedValue(null);

      const result = await connector.getGroupsByUserId(userId);
      expect(result).toEqual([]);
    });

    it('should handle partial group success in getGroupsByUserId', async () => {
      const userId = 'user-123';
      const assignment = {
        userId,
        roleIds: [],
        groupIds: ['existing-group', 'missing-group'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const existingGroup = {
        id: 'existing-group',
        name: 'Existing Group',
        members: [],
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock assignment fetch and mixed group results
      jest.spyOn(connector, 'getUserAssignment').mockResolvedValue(assignment);
      jest.spyOn(connector, 'getGroup')
        .mockResolvedValueOnce(existingGroup)
        .mockResolvedValueOnce(null);

      const result = await connector.getGroupsByUserId(userId);
      expect(result).toEqual([existingGroup]);
      expect(connector.getGroup).toHaveBeenCalledTimes(2);
    });
  });

  describe('Branch coverage for conditional paths', () => {
    it('should handle empty forEach in listTemplates', async () => {
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          // Don't call callback - simulates empty collection
        })
      };

      mockCollection.get.mockResolvedValue(mockQuerySnapshot);

      const result = await connector.listTemplates();
      expect(result).toEqual([]);
      expect(mockQuerySnapshot.forEach).toHaveBeenCalled();
    });

    it('should handle forEach with multiple documents in listTemplates', async () => {
      const doc1Data = {
        name: 'Template 1',
        permissions: [],
        createdAt: { toDate: () => new Date('2023-01-01') },
        updatedAt: { toDate: () => new Date('2023-01-02') }
      };

      const doc2Data = {
        name: 'Template 2',
        permissions: [],
        createdAt: { toDate: () => new Date('2023-01-03') },
        updatedAt: { toDate: () => new Date('2023-01-04') }
      };

      const mockDoc1 = { id: 'template-1', data: () => doc1Data };
      const mockDoc2 = { id: 'template-2', data: () => doc2Data };

      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          callback(mockDoc1);
          callback(mockDoc2);
        })
      };

      mockCollection.get.mockResolvedValue(mockQuerySnapshot);

      const result = await connector.listTemplates();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Template 1');
      expect(result[1].name).toBe('Template 2');
    });

    it('should handle documents with missing timestamp fields', async () => {
      const docData = {
        name: 'Template No Timestamps',
        permissions: []
        // Missing createdAt and updatedAt
      };

      const mockDocSnapshot = { id: 'template-no-ts', data: () => docData };

      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          callback(mockDocSnapshot);
        })
      };

      mockCollection.get.mockResolvedValue(mockQuerySnapshot);

      const result = await connector.listTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Additional edge cases for complete coverage', () => {
    it('should handle deleteUser with deleteUserAssignment success', async () => {
      // Mock successful operations
      jest.spyOn(connector, 'deleteUserAssignment').mockResolvedValue(undefined);
      mockDoc.delete.mockResolvedValue(undefined);

      await connector.deleteUser('user-123');

      expect(connector.deleteUserAssignment).toHaveBeenCalledWith('user-123');
      expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('should handle all data fields with proper timestamp conversion', async () => {
      const complexData = {
        id: 'complex-user',
        email: 'complex@example.com',
        name: 'Complex User',
        metadata: { complex: true },
        createdAt: { toDate: () => new Date('2023-01-01') },
        updatedAt: { toDate: () => new Date('2023-01-02') }
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(complexData);
      mockDoc.id = 'complex-user';
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await connector.getUser('complex-user');

      expect(result).toEqual({
        id: 'complex-user',
        email: 'complex@example.com',
        name: 'Complex User',
        metadata: { complex: true },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      });
    });
  });
});