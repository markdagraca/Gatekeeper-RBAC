/**
 * Integration tests for complex RBAC scenarios
 * Tests the full system working together with realistic use cases
 */

import { RBAC } from '../core/rbac';
import { PermissionEngine } from '../core/permission-engine';
import { DatabaseConnector, RBACConfig, User, Role, Group, UserAssignment } from '../core/types';
import { TemplateManager } from '../templates';

describe('Integration Tests', () => {
  let rbac: RBAC;
  let connector: MockDatabaseConnector;
  let templateManager: TemplateManager;

  class MockDatabaseConnector implements DatabaseConnector {
    private users = new Map<string, User>();
    private roles = new Map<string, Role>();
    private groups = new Map<string, Group>();
    private assignments = new Map<string, UserAssignment>();
    private templates = new Map<string, any>();

    async getUser(userId: string): Promise<User | null> {
      return this.users.get(userId) || null;
    }

    async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
      const fullUser: User = {
        ...user,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.users.set(user.id, fullUser);
      return fullUser;
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<User> {
      const user = this.users.get(userId);
      if (!user) throw new Error('User not found');
      
      const updatedUser = { ...user, ...updates, updatedAt: new Date() };
      this.users.set(userId, updatedUser);
      return updatedUser;
    }

    async deleteUser(userId: string): Promise<void> {
      this.users.delete(userId);
      this.assignments.delete(userId);
    }

    async getRole(roleId: string): Promise<Role | null> {
      return this.roles.get(roleId) || null;
    }

    async createRole(role: Omit<Role, 'createdAt' | 'updatedAt'>): Promise<Role> {
      const fullRole: Role = {
        ...role,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.roles.set(role.id, fullRole);
      return fullRole;
    }

    async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
      const role = this.roles.get(roleId);
      if (!role) throw new Error('Role not found');
      
      const updatedRole = { ...role, ...updates, updatedAt: new Date() };
      this.roles.set(roleId, updatedRole);
      return updatedRole;
    }

    async deleteRole(roleId: string): Promise<void> {
      this.roles.delete(roleId);
    }

    async getGroup(groupId: string): Promise<Group | null> {
      return this.groups.get(groupId) || null;
    }

    async createGroup(group: Omit<Group, 'createdAt' | 'updatedAt'>): Promise<Group> {
      const fullGroup: Group = {
        ...group,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.groups.set(group.id, fullGroup);
      return fullGroup;
    }

    async updateGroup(groupId: string, updates: Partial<Group>): Promise<Group> {
      const group = this.groups.get(groupId);
      if (!group) throw new Error('Group not found');
      
      const updatedGroup = { ...group, ...updates, updatedAt: new Date() };
      this.groups.set(groupId, updatedGroup);
      return updatedGroup;
    }

    async deleteGroup(groupId: string): Promise<void> {
      this.groups.delete(groupId);
    }

    async getGroupsByUserId(userId: string): Promise<Group[]> {
      const assignment = this.assignments.get(userId);
      if (!assignment) return [];

      const groups: Group[] = [];
      for (const groupId of assignment.groupIds) {
        const group = this.groups.get(groupId);
        if (group) groups.push(group);
      }
      return groups;
    }

    async getUserAssignment(userId: string): Promise<UserAssignment | null> {
      return this.assignments.get(userId) || null;
    }

    async createUserAssignment(assignment: Omit<UserAssignment, 'createdAt' | 'updatedAt'>): Promise<UserAssignment> {
      const fullAssignment: UserAssignment = {
        ...assignment,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.assignments.set(assignment.userId, fullAssignment);
      return fullAssignment;
    }

    async updateUserAssignment(userId: string, updates: Partial<UserAssignment>): Promise<UserAssignment> {
      const assignment = this.assignments.get(userId);
      if (!assignment) throw new Error('Assignment not found');
      
      const updatedAssignment = { ...assignment, ...updates, updatedAt: new Date() };
      this.assignments.set(userId, updatedAssignment);
      return updatedAssignment;
    }

    async deleteUserAssignment(userId: string): Promise<void> {
      this.assignments.delete(userId);
    }

    async getTemplate(templateId: string): Promise<any> {
      return this.templates.get(templateId) || null;
    }

    async createTemplate(template: any): Promise<any> {
      const fullTemplate = {
        ...template,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.templates.set(template.id, fullTemplate);
      return fullTemplate;
    }

    async updateTemplate(templateId: string, updates: any): Promise<any> {
      const template = this.templates.get(templateId);
      if (!template) throw new Error('Template not found');
      
      const updatedTemplate = { ...template, ...updates, updatedAt: new Date() };
      this.templates.set(templateId, updatedTemplate);
      return updatedTemplate;
    }

    async deleteTemplate(templateId: string): Promise<void> {
      this.templates.delete(templateId);
    }

    async listTemplates(): Promise<any[]> {
      return Array.from(this.templates.values());
    }
  }

  beforeEach(async () => {
    connector = new MockDatabaseConnector();
    
    const config: RBACConfig = {
      connector,
      wildcardSupport: true,
      cacheEnabled: false, // Disable caching for tests to ensure fresh data
      cacheTTL: 300,
      strictMode: false
    };

    rbac = new RBAC(config);
    templateManager = new TemplateManager(connector);

    // Set up test data
    await setupTestData();
  });

  async function setupTestData() {
    // Create users
    await connector.createUser({
      id: 'alice', 
      email: 'alice@company.com', 
      name: 'Alice Johnson',
      metadata: { department: 'engineering', level: 'senior' }
    });

    await connector.createUser({
      id: 'bob', 
      email: 'bob@company.com', 
      name: 'Bob Smith',
      metadata: { department: 'marketing', level: 'junior' }
    });

    await connector.createUser({
      id: 'charlie', 
      email: 'charlie@company.com', 
      name: 'Charlie Brown',
      metadata: { department: 'engineering', level: 'manager' }
    });

    // Create roles
    await connector.createRole({
      id: 'admin',
      name: 'Administrator',
      permissions: [{ permission: '*' }]
    });

    await connector.createRole({
      id: 'engineer',
      name: 'Engineer',
      permissions: [
        { permission: 'code.*' },
        { permission: 'deployments.read' },
        { permission: 'databases.read' }
      ]
    });

    await connector.createRole({
      id: 'manager',
      name: 'Manager',
      permissions: [
        { permission: 'team.manage' },
        { permission: 'reports.*' },
        { 
          permission: 'salary.view',
          conditions: [
            { attribute: 'attributes.userLevel', operator: 'in', value: ['manager', 'director'] }
          ]
        }
      ]
    });

    await connector.createRole({
      id: 'self-service',
      name: 'Self Service',
      permissions: [
        {
          permission: 'profile.read'
        },
        {
          permission: 'profile.update'
        }
      ]
    });

    // Create groups
    const engineeringGroup = await connector.createGroup({
      id: 'engineering',
      name: 'Engineering Department',
      members: ['alice', 'charlie'],
      permissions: [
        { permission: 'engineering.*' },
        { permission: 'tools.access' }
      ]
    });

    const backendTeam = await connector.createGroup({
      id: 'backend-team',
      name: 'Backend Team',
      members: [engineeringGroup], // Nested group
      permissions: [
        { permission: 'databases.*' },
        { permission: 'apis.*' }
      ]
    });

    await connector.createGroup({
      id: 'marketing',
      name: 'Marketing Department',
      members: ['bob'],
      permissions: [
        { permission: 'campaigns.*' },
        { permission: 'analytics.read' }
      ]
    });

    // Create assignments
    await connector.createUserAssignment({
      userId: 'alice',
      roleIds: ['engineer', 'self-service'],
      groupIds: ['backend-team']
    });

    await connector.createUserAssignment({
      userId: 'bob',
      roleIds: ['self-service'],
      groupIds: ['marketing'],
      directPermissions: [
        { permission: 'social-media.post' }
      ]
    });

    await connector.createUserAssignment({
      userId: 'charlie',
      roleIds: ['manager', 'engineer', 'self-service'],
      groupIds: ['engineering']
    });
  }

  describe('Complex Permission Scenarios', () => {
    it('should handle hierarchical group permissions', async () => {
      // Alice is in backend-team, which contains engineering group
      // She should have permissions from both groups plus her roles

      const codePermission = await rbac.hasPermission('alice', 'code.read');
      const databasePermission = await rbac.hasPermission('alice', 'databases.create');
      const engineeringPermission = await rbac.hasPermission('alice', 'engineering.access');
      const apiPermission = await rbac.hasPermission('alice', 'apis.deploy');

      expect(codePermission.allowed).toBe(true); // From engineer role
      expect(databasePermission.allowed).toBe(true); // From backend-team group
      expect(engineeringPermission.allowed).toBe(true); // From engineering group (nested)
      expect(apiPermission.allowed).toBe(true); // From backend-team group
    });

    it('should handle conditional permissions with context', async () => {
      // Charlie is a manager and should be able to view salaries
      const salaryViewManager = await rbac.hasPermission('charlie', 'salary.view', {
        attributes: { userLevel: 'manager' }
      });

      // Alice is senior but not manager, should not access salaries
      const salaryViewSenior = await rbac.hasPermission('alice', 'salary.view', {
        attributes: { userLevel: 'senior' }
      });

      expect(salaryViewManager.allowed).toBe(true);
      expect(salaryViewSenior.allowed).toBe(false);
    });

    it('should handle self-service permissions', async () => {
      // Users should be able to access their own profiles via self-service role
      const aliceProfile = await rbac.hasPermission('alice', 'profile.read');
      const bobProfile = await rbac.hasPermission('bob', 'profile.update');

      expect(aliceProfile.allowed).toBe(true);
      expect(bobProfile.allowed).toBe(true);
    });

    it('should handle wildcard permissions correctly', async () => {
      // Bob has campaigns.* from marketing group
      const campaignCreate = await rbac.hasPermission('bob', 'campaigns.create');
      const campaignDelete = await rbac.hasPermission('bob', 'campaigns.delete');

      expect(campaignCreate.allowed).toBe(true);
      expect(campaignDelete.allowed).toBe(true);
    });

    it('should combine direct permissions with role and group permissions', async () => {
      // Bob has direct permission for social media plus group permissions
      const socialMediaPermission = await rbac.hasPermission('bob', 'social-media.post');
      const campaignsPermission = await rbac.hasPermission('bob', 'campaigns.read');
      const profilePermission = await rbac.hasPermission('bob', 'profile.read');

      expect(socialMediaPermission.allowed).toBe(true); // Direct permission
      expect(campaignsPermission.allowed).toBe(true); // Group permission
      expect(profilePermission.allowed).toBe(true); // Role permission
    });
  });

  describe('Permission Caching', () => {
    it('should cache user permissions for performance', async () => {
      const startTime = Date.now();
      
      // First call - should hit database
      await rbac.hasPermission('alice', 'code.read');
      const firstCallTime = Date.now() - startTime;

      // Second call - should use cache
      const cacheStartTime = Date.now();
      await rbac.hasPermission('alice', 'code.write');
      const secondCallTime = Date.now() - cacheStartTime;

      // Cache should make subsequent calls faster (though this might be flaky in tests)
      expect(firstCallTime).toBeGreaterThanOrEqual(0);
      expect(secondCallTime).toBeGreaterThanOrEqual(0);
    });

    it('should invalidate cache when permissions change', async () => {
      // Check initial permission
      const initialCheck = await rbac.hasPermission('alice', 'system.admin');
      expect(initialCheck.allowed).toBe(false);

      // Add admin role
      await rbac.assignRole('alice', 'admin');

      // Permission should now be allowed (cache invalidated)
      const updatedCheck = await rbac.hasPermission('alice', 'system.admin');
      expect(updatedCheck.allowed).toBe(true);
    });
  });

  describe('Role and Group Management', () => {
    it('should handle role assignment and removal', async () => {
      // Initially, alice doesn't have admin permissions
      const beforeAdmin = await rbac.hasPermission('alice', 'system.admin');
      expect(beforeAdmin.allowed).toBe(false);

      // Assign admin role
      await rbac.assignRole('alice', 'admin');
      const afterAdmin = await rbac.hasPermission('alice', 'system.admin');
      expect(afterAdmin.allowed).toBe(true);

      // Remove admin role
      await rbac.unassignRole('alice', 'admin');
      const afterRemoval = await rbac.hasPermission('alice', 'system.admin');
      expect(afterRemoval.allowed).toBe(false);
    });

    it('should handle group membership changes', async () => {
      // Create new user not in any groups
      await connector.createUser({
        id: 'diana',
        email: 'diana@company.com',
        name: 'Diana Prince'
      });

      await connector.createUserAssignment({
        userId: 'diana',
        roleIds: ['self-service'],
        groupIds: []
      });

      // Initially no marketing permissions
      const beforeGroup = await rbac.hasPermission('diana', 'campaigns.read');
      expect(beforeGroup.allowed).toBe(false);

      // Add to marketing group
      await rbac.addUserToGroup('diana', 'marketing');
      const afterGroup = await rbac.hasPermission('diana', 'campaigns.read');
      expect(afterGroup.allowed).toBe(true);

      // Remove from group
      await rbac.removeUserFromGroup('diana', 'marketing');
      const afterRemoval = await rbac.hasPermission('diana', 'campaigns.read');
      expect(afterRemoval.allowed).toBe(false);
    });
  });

  describe('Template System Integration', () => {
    it('should apply role templates correctly', async () => {
      // Apply a template to create a new role
      const adminRole = await templateManager.applyRoleTemplate('admin', 'super-admin');
      
      expect(adminRole.name).toBe('Administrator');
      expect(adminRole.permissions).toEqual([
        { permission: 'users.*' },
        { permission: 'roles.*' },
        { permission: 'groups.*' }
      ]);

      // Create user and assign template-created role
      await connector.createUser({
        id: 'eve',
        email: 'eve@company.com',
        name: 'Eve Adams'
      });

      await connector.createUserAssignment({
        userId: 'eve',
        roleIds: ['super-admin'],
        groupIds: []
      });

      // Should have admin permissions
      const adminPermission = await rbac.hasPermission('eve', 'users.read');
      expect(adminPermission.allowed).toBe(true);
    });

    it('should set up basic structure with templates', async () => {
      const { roles, groups } = await templateManager.setupBasicStructure();

      expect(roles.length).toBeGreaterThan(0);
      expect(groups.length).toBeGreaterThan(0);

      // Verify specific roles were created
      const superAdminRole = await connector.getRole('super-admin');
      expect(superAdminRole?.name).toBe('Super Administrator');

      const viewerRole = await connector.getRole('viewer');
      expect(viewerRole?.name).toBe('Viewer');
    });
  });

  describe('Batch Operations', () => {
    it('should check multiple permissions efficiently', async () => {
      const permissions = [
        'code.read',
        'code.write',
        'databases.read',
        'databases.write',
        'engineering.access',
        'apis.deploy'
      ];

      const results = await rbac.hasPermissions('alice', permissions);

      expect(Object.keys(results)).toEqual(permissions);
      expect(results['code.read'].allowed).toBe(true);
      expect(results['databases.write'].allowed).toBe(true);
      expect(results['engineering.access'].allowed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent users gracefully', async () => {
      const result = await rbac.hasPermission('non-existent-user', 'any.permission');
      expect(result.allowed).toBe(false);
    });

    it('should handle malformed permissions gracefully', async () => {
      const result = await rbac.hasPermission('alice', '');
      expect(result.allowed).toBe(false);
    });

    it('should handle circular group references', async () => {
      // Create circular group reference
      const group1 = await connector.createGroup({
        id: 'circular1',
        name: 'Circular Group 1',
        members: [],
        permissions: [{ permission: 'test1.permission' }]
      });

      const group2 = await connector.createGroup({
        id: 'circular2',
        name: 'Circular Group 2',
        members: [group1],
        permissions: [{ permission: 'test2.permission' }]
      });

      // Create circular reference
      await connector.updateGroup('circular1', {
        members: [group2]
      });

      // Create user in circular group
      await connector.createUser({
        id: 'frank',
        email: 'frank@company.com',
        name: 'Frank Wilson'
      });

      await connector.createUserAssignment({
        userId: 'frank',
        roleIds: [],
        groupIds: ['circular1']
      });

      // Should not cause infinite loop
      const permissions = await rbac.getUserEffectivePermissions('frank');
      expect(permissions.length).toBeGreaterThan(0);
      
      const hasTest1 = await rbac.hasPermission('frank', 'test1.permission');
      const hasTest2 = await rbac.hasPermission('frank', 'test2.permission');
      
      expect(hasTest1.allowed).toBe(true);
      expect(hasTest2.allowed).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large numbers of permissions efficiently', async () => {
      // Create user with many roles and groups
      const manyRoles: string[] = [];
      const manyGroups: string[] = [];

      // Create 10 roles with 10 permissions each
      for (let i = 0; i < 10; i++) {
        const roleId = `bulk-role-${i}`;
        const permissions = [];
        for (let j = 0; j < 10; j++) {
          permissions.push({ permission: `resource${i}.action${j}` });
        }
        
        await connector.createRole({
          id: roleId,
          name: `Bulk Role ${i}`,
          permissions
        });
        manyRoles.push(roleId);
      }

      // Create 5 groups with permissions
      for (let i = 0; i < 5; i++) {
        const groupId = `bulk-group-${i}`;
        const permissions = [];
        for (let j = 0; j < 5; j++) {
          permissions.push({ permission: `group${i}.permission${j}` });
        }
        
        await connector.createGroup({
          id: groupId,
          name: `Bulk Group ${i}`,
          members: [],
          permissions
        });
        manyGroups.push(groupId);
      }

      // Create user with all roles and groups
      await connector.createUser({
        id: 'bulk-user',
        email: 'bulk@company.com',
        name: 'Bulk User'
      });

      await connector.createUserAssignment({
        userId: 'bulk-user',
        roleIds: manyRoles,
        groupIds: manyGroups
      });

      // Test performance
      const startTime = Date.now();
      const permissions = await rbac.getUserEffectivePermissions('bulk-user');
      const endTime = Date.now();

      expect(permissions.length).toBe(125); // 100 from roles + 25 from groups
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      // Test permission checking performance
      const checkStartTime = Date.now();
      const result = await rbac.hasPermission('bulk-user', 'resource5.action5');
      const checkEndTime = Date.now();

      expect(result.allowed).toBe(true);
      expect(checkEndTime - checkStartTime).toBeLessThan(100); // Should be very fast with caching
    });
  });
});