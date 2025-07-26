import { FirebaseConnector, createFirebaseConnector } from '../firebase';
import { User, Role, Group, UserAssignment, PermissionTemplate } from '../../core/types';

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

const mockCollection = {
  doc: jest.fn(),
  get: jest.fn(),
  add: jest.fn()
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

const mockQuerySnapshot = {
  forEach: jest.fn(),
  docs: []
};

describe('FirebaseConnector', () => {
  let connector: FirebaseConnector;
  let mockData: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock chain
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    mockCollection.get.mockResolvedValue(mockQuerySnapshot);
    
    connector = new FirebaseConnector(mockFirestore as any);
    
    mockData = {
      id: 'test-id',
      name: 'Test Name',
      email: 'test@example.com',
      createdAt: { toDate: () => new Date('2023-01-01') },
      updatedAt: { toDate: () => new Date('2023-01-02') }
    };
  });

  describe('User operations', () => {
    describe('getUser', () => {
      it('should return user when exists', async () => {
        mockDoc.exists = true;
        mockDoc.data.mockReturnValue(mockData);
        mockDoc.id = 'user-123';
        mockDoc.get.mockResolvedValue(mockDoc);

        const user = await connector.getUser('user-123');

        expect(user).toEqual({
          id: 'user-123',
          ...mockData,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02')
        });
        expect(mockFirestore.collection).toHaveBeenCalledWith('rbac_users');
        expect(mockCollection.doc).toHaveBeenCalledWith('user-123');
      });

      it('should return null when user does not exist', async () => {
        mockDoc.exists = false;
        mockDoc.get.mockResolvedValue(mockDoc);

        const user = await connector.getUser('user-123');

        expect(user).toBeNull();
      });

      it('should handle missing timestamps', async () => {
        const dataWithoutTimestamps = { ...mockData };
        delete dataWithoutTimestamps.createdAt;
        delete dataWithoutTimestamps.updatedAt;

        mockDoc.exists = true;
        mockDoc.data.mockReturnValue(dataWithoutTimestamps);
        mockDoc.id = 'user-123';
        mockDoc.get.mockResolvedValue(mockDoc);

        const user = await connector.getUser('user-123');

        expect(user?.createdAt).toBeInstanceOf(Date);
        expect(user?.updatedAt).toBeInstanceOf(Date);
      });

      it('should throw error on failure', async () => {
        mockDoc.get.mockRejectedValue(new Error('Firestore error'));

        await expect(connector.getUser('user-123')).rejects.toThrow('Failed to get user: Error: Firestore error');
      });
    });

    describe('createUser', () => {
      it('should create user successfully', async () => {
        const userData: Omit<User, 'createdAt' | 'updatedAt'> = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        };

        mockDoc.set.mockResolvedValue(undefined);

        const user = await connector.createUser(userData);

        expect(user).toEqual({
          ...userData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        });
        expect(mockDoc.set).toHaveBeenCalledWith({
          ...userData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        });
      });

      it('should throw error on failure', async () => {
        const userData: Omit<User, 'createdAt' | 'updatedAt'> = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        };

        mockDoc.set.mockRejectedValue(new Error('Firestore error'));

        await expect(connector.createUser(userData)).rejects.toThrow('Failed to create user');
      });
    });

    describe('updateUser', () => {
      it('should update user successfully', async () => {
        const updates = { name: 'Updated Name' };
        const existingUser: User = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockDoc.update.mockResolvedValue(undefined);
        
        // Mock getUser to return the updated user
        jest.spyOn(connector, 'getUser').mockResolvedValue({
          ...existingUser,
          ...updates,
          updatedAt: expect.any(Date)
        } as User);

        const user = await connector.updateUser('user-123', updates);

        expect(mockDoc.update).toHaveBeenCalledWith({
          ...updates,
          updatedAt: expect.any(Date)
        });
        expect(user.name).toBe('Updated Name');
      });

      it('should throw error when user not found after update', async () => {
        mockDoc.update.mockResolvedValue(undefined);
        jest.spyOn(connector, 'getUser').mockResolvedValue(null);

        await expect(connector.updateUser('user-123', { name: 'Updated' }))
          .rejects.toThrow('User not found after update');
      });
    });

    describe('deleteUser', () => {
      it('should delete user and assignment', async () => {
        mockDoc.delete.mockResolvedValue(undefined);
        jest.spyOn(connector, 'deleteUserAssignment').mockResolvedValue(undefined);

        await connector.deleteUser('user-123');

        expect(connector.deleteUserAssignment).toHaveBeenCalledWith('user-123');
        expect(mockDoc.delete).toHaveBeenCalled();
      });

      it('should throw error on failure', async () => {
        mockDoc.delete.mockRejectedValue(new Error('Firestore error'));

        await expect(connector.deleteUser('user-123')).rejects.toThrow('Failed to delete user');
      });
    });
  });

  describe('Group operations', () => {
    describe('getGroup', () => {
      it('should return group when exists', async () => {
        const groupData = {
          name: 'Test Group',  
          members: ['user-123'],
          permissions: [{ permission: 'test.read' }],
          createdAt: { toDate: () => new Date('2023-01-01') },
          updatedAt: { toDate: () => new Date('2023-01-02') }
        };

        mockDoc.exists = true;
        mockDoc.data.mockReturnValue(groupData);
        mockDoc.id = 'group-123';
        mockDoc.get.mockResolvedValue(mockDoc);

        const group = await connector.getGroup('group-123');

        expect(group).toEqual({
          id: 'group-123',
          ...groupData,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02')
        });
      });

      it('should return null when group does not exist', async () => {
        mockDoc.exists = false;
        mockDoc.get.mockResolvedValue(mockDoc);

        const group = await connector.getGroup('group-123');

        expect(group).toBeNull();
      });
    });

    describe('createGroup', () => {
      it('should create group successfully', async () => {
        const groupData: Omit<Group, 'createdAt' | 'updatedAt'> = {
          id: 'group-123',
          name: 'Test Group',
          members: ['user-123'],
          permissions: [{ permission: 'test.read' }]
        };

        mockDoc.set.mockResolvedValue(undefined);

        const group = await connector.createGroup(groupData);

        expect(group).toEqual({
          ...groupData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        });
      });
    });

    describe('getGroupsByUserId', () => {
      it('should return groups for user', async () => {
        const mockAssignment: UserAssignment = {
          userId: 'user-123',
          roleIds: [],
          groupIds: ['group-123', 'group-456'],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockGroup: Group = {
          id: 'group-123',
          name: 'Test Group',
          members: [],
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        jest.spyOn(connector, 'getUserAssignment').mockResolvedValue(mockAssignment);
        jest.spyOn(connector, 'getGroup')
          .mockResolvedValueOnce(mockGroup)
          .mockResolvedValueOnce(null); // Second group not found

        const groups = await connector.getGroupsByUserId('user-123');

        expect(groups).toEqual([mockGroup]);
        expect(connector.getGroup).toHaveBeenCalledWith('group-123');
        expect(connector.getGroup).toHaveBeenCalledWith('group-456');
      });

      it('should return empty array when user has no assignment', async () => {
        jest.spyOn(connector, 'getUserAssignment').mockResolvedValue(null);

        const groups = await connector.getGroupsByUserId('user-123');

        expect(groups).toEqual([]);
      });
    });
  });

  describe('Role operations', () => {
    describe('getRole', () => {
      it('should return role when exists', async () => {
        const roleData = {
          name: 'Test Role',
          permissions: [{ permission: 'test.read' }],
          createdAt: { toDate: () => new Date('2023-01-01') },
          updatedAt: { toDate: () => new Date('2023-01-02') }
        };

        mockDoc.exists = true;
        mockDoc.data.mockReturnValue(roleData);
        mockDoc.id = 'role-123';
        mockDoc.get.mockResolvedValue(mockDoc);

        const role = await connector.getRole('role-123');

        expect(role).toEqual({
          id: 'role-123',
          ...roleData,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02')
        });
      });

      it('should return null when role does not exist', async () => {
        mockDoc.exists = false;
        mockDoc.get.mockResolvedValue(mockDoc);

        const role = await connector.getRole('role-123');

        expect(role).toBeNull();
      });
    });

    describe('createRole', () => {
      it('should create role successfully', async () => {
        const roleData: Omit<Role, 'createdAt' | 'updatedAt'> = {
          id: 'role-123',
          name: 'Test Role',
          permissions: [{ permission: 'test.read' }]
        };

        mockDoc.set.mockResolvedValue(undefined);

        const role = await connector.createRole(roleData);

        expect(role).toEqual({
          ...roleData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        });
      });
    });
  });

  describe('Assignment operations', () => {
    describe('getUserAssignment', () => {
      it('should return assignment when exists', async () => {
        const assignmentData = {
          roleIds: ['role-123'],
          groupIds: ['group-123'],
          directPermissions: [{ permission: 'direct.permission' }],
          createdAt: { toDate: () => new Date('2023-01-01') },
          updatedAt: { toDate: () => new Date('2023-01-02') }
        };

        mockDoc.exists = true;
        mockDoc.data.mockReturnValue(assignmentData);
        mockDoc.id = 'user-123';
        mockDoc.get.mockResolvedValue(mockDoc);

        const assignment = await connector.getUserAssignment('user-123');

        expect(assignment).toEqual({
          userId: 'user-123',
          ...assignmentData,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02')
        });
      });

      it('should return null when assignment does not exist', async () => {
        mockDoc.exists = false;
        mockDoc.get.mockResolvedValue(mockDoc);

        const assignment = await connector.getUserAssignment('user-123');

        expect(assignment).toBeNull();
      });
    });

    describe('createUserAssignment', () => {
      it('should create assignment successfully', async () => {
        const assignmentData: Omit<UserAssignment, 'createdAt' | 'updatedAt'> = {
          userId: 'user-123',
          roleIds: ['role-123'],
          groupIds: ['group-123']
        };

        mockDoc.set.mockResolvedValue(undefined);

        const assignment = await connector.createUserAssignment(assignmentData);

        expect(assignment).toEqual({
          ...assignmentData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        });
      });
    });
  });

  describe('Template operations', () => {
    describe('getTemplate', () => {
      it('should return template when exists', async () => {
        const templateData = {
          name: 'Test Template',
          permissions: [{ permission: 'test.read' }],
          variables: { resource: 'users' },
          createdAt: { toDate: () => new Date('2023-01-01') },
          updatedAt: { toDate: () => new Date('2023-01-02') }
        };

        mockDoc.exists = true;
        mockDoc.data.mockReturnValue(templateData);
        mockDoc.id = 'template-123';
        mockDoc.get.mockResolvedValue(mockDoc);

        const template = await connector.getTemplate('template-123');

        expect(template).toEqual({
          id: 'template-123',
          ...templateData,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02')
        });
      });

      it('should return null when template does not exist', async () => {
        mockDoc.exists = false;
        mockDoc.get.mockResolvedValue(mockDoc);

        const template = await connector.getTemplate('template-123');

        expect(template).toBeNull();
      });
    });

    describe('createTemplate', () => {
      it('should create template successfully', async () => {
        const templateData: Omit<PermissionTemplate, 'createdAt' | 'updatedAt'> = {
          id: 'template-123',
          name: 'Test Template',
          permissions: [{ permission: 'test.read' }]
        };

        mockDoc.set.mockResolvedValue(undefined);

        const template = await connector.createTemplate(templateData);

        expect(template).toEqual({
          ...templateData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        });
      });
    });

    describe('listTemplates', () => {
      it('should return all templates', async () => {
        const templateData1 = {
          name: 'Template 1',
          permissions: [],
          createdAt: { toDate: () => new Date('2023-01-01') },
          updatedAt: { toDate: () => new Date('2023-01-02') }
        };

        const templateData2 = {
          name: 'Template 2',
          permissions: [],
          createdAt: { toDate: () => new Date('2023-01-01') },
          updatedAt: { toDate: () => new Date('2023-01-02') }
        };

        const mockDoc1 = {
          id: 'template-1',
          data: () => templateData1
        };

        const mockDoc2 = {
          id: 'template-2',
          data: () => templateData2
        };

        mockQuerySnapshot.forEach.mockImplementation((callback: any) => {
          callback(mockDoc1);
          callback(mockDoc2);
        });

        mockCollection.get.mockResolvedValue(mockQuerySnapshot);

        const templates = await connector.listTemplates();

        expect(templates).toHaveLength(2);
        expect(templates[0]).toEqual({
          id: 'template-1',
          ...templateData1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02')
        });
        expect(templates[1]).toEqual({
          id: 'template-2',
          ...templateData2,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02')
        });
      });

      it('should return empty array when no templates exist', async () => {
        mockQuerySnapshot.forEach.mockImplementation(() => {});
        mockCollection.get.mockResolvedValue(mockQuerySnapshot);

        const templates = await connector.listTemplates();

        expect(templates).toEqual([]);
      });

      it('should throw error on failure', async () => {
        mockCollection.get.mockRejectedValue(new Error('Firestore error'));

        await expect(connector.listTemplates()).rejects.toThrow('Failed to list templates');
      });
    });
  });

  describe('Custom collection names', () => {
    it('should use custom collection names', async () => {
      const customConnector = new FirebaseConnector(mockFirestore as any, {
        users: 'custom_users',
        roles: 'custom_roles',
        groups: 'custom_groups',
        assignments: 'custom_assignments',
        templates: 'custom_templates'
      });

      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      await customConnector.getUser('user-123');

      expect(mockFirestore.collection).toHaveBeenCalledWith('custom_users');
    });
  });

  describe('createFirebaseConnector helper', () => {
    it('should create connector with default options', () => {
      const connector = createFirebaseConnector(mockFirestore as any);

      expect(connector).toBeInstanceOf(FirebaseConnector);
    });

    it('should create connector with custom options', () => {
      const connector = createFirebaseConnector(mockFirestore as any, {
        collections: {
          users: 'custom_users'
        }
      });

      expect(connector).toBeInstanceOf(FirebaseConnector);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockDoc.get.mockRejectedValue(new Error('Network error'));

      await expect(connector.getUser('user-123')).rejects.toThrow('Failed to get user');
    });

    it('should handle malformed data', async () => {
      mockDoc.exists = true;
      mockDoc.data.mockReturnValue({});
      mockDoc.id = 'user-123';
      mockDoc.get.mockResolvedValue(mockDoc);

      const user = await connector.getUser('user-123');

      expect(user?.createdAt).toBeInstanceOf(Date);
      expect(user?.updatedAt).toBeInstanceOf(Date);
    });
  });
});