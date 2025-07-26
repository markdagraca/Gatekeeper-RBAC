import {
  commonPermissions,
  roleTemplates,
  groupTemplates,
  PermissionTemplateBuilder,
  TemplateManager,
  createTemplateManager,
  createPermissionTemplate
} from '../index';
import { DatabaseConnector } from '../../core/types';

describe('Templates', () => {
  let mockConnector: jest.Mocked<DatabaseConnector>;
  let templateManager: TemplateManager;

  beforeEach(() => {
    mockConnector = {
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getGroup: jest.fn(),
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      getGroupsByUserId: jest.fn(),
      getRole: jest.fn(),
      createRole: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      getUserAssignment: jest.fn(),
      createUserAssignment: jest.fn(),
      updateUserAssignment: jest.fn(),
      deleteUserAssignment: jest.fn(),
      getTemplate: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      listTemplates: jest.fn()
    };

    templateManager = new TemplateManager(mockConnector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('commonPermissions', () => {
    it('should generate CRUD permissions', () => {
      expect(commonPermissions.create('users')).toBe('users.create');
      expect(commonPermissions.read('users')).toBe('users.read');
      expect(commonPermissions.update('users')).toBe('users.update');
      expect(commonPermissions.delete('users')).toBe('users.delete');
      expect(commonPermissions.list('users')).toBe('users.list');
    });

    it('should generate administrative permissions', () => {
      expect(commonPermissions.admin('users')).toBe('users.admin');
      expect(commonPermissions.manage('users')).toBe('users.manage');
    });

    it('should generate wildcard permissions', () => {
      expect(commonPermissions.all('users')).toBe('users.*');
      expect(commonPermissions.everything()).toBe('*');
    });

    it('should generate ownership permissions', () => {
      expect(commonPermissions.own('users', 'read')).toBe('users.read.own');
    });

    it('should provide system permissions', () => {
      expect(commonPermissions.system.admin).toBe('system.admin');
      expect(commonPermissions.system.manage).toBe('system.manage');
      expect(commonPermissions.system.view).toBe('system.view');
    });
  });

  describe('roleTemplates', () => {
    describe('superAdmin', () => {
      it('should create super admin role with all permissions', () => {
        const role = roleTemplates.superAdmin();

        expect(role.name).toBe('Super Administrator');
        expect(role.description).toBe('Full system access with all permissions');
        expect(role.permissions).toEqual([{ permission: '*' }]);
      });
    });

    describe('admin', () => {
      it('should create admin role with default resources', () => {
        const role = roleTemplates.admin();

        expect(role.name).toBe('Administrator');
        expect(role.permissions).toEqual([
          { permission: 'users.*' },
          { permission: 'roles.*' },
          { permission: 'groups.*' }
        ]);
      });

      it('should create admin role with custom resources', () => {
        const role = roleTemplates.admin(['posts', 'comments']);

        expect(role.permissions).toEqual([
          { permission: 'posts.*' },
          { permission: 'comments.*' }
        ]);
      });
    });

    describe('userManager', () => {
      it('should create user manager role', () => {
        const role = roleTemplates.userManager();

        expect(role.name).toBe('User Manager');
        expect(role.permissions).toEqual(expect.arrayContaining([
          { permission: 'users.create' },
          { permission: 'users.read' },
          { permission: 'users.update' },
          { permission: 'users.list' },
          { permission: 'assignments.create' },
          { permission: 'assignments.update' },
          { permission: 'assignments.read' }
        ]));
      });
    });

    describe('contentManager', () => {
      it('should create content manager role', () => {
        const role = roleTemplates.contentManager();

        expect(role.name).toBe('Content Manager');
        expect(role.permissions).toEqual(expect.arrayContaining([
          { permission: 'content.*' },
          { permission: 'media.*' },
          { permission: 'categories.read' },
          { permission: 'categories.list' }
        ]));
      });
    });

    describe('contentEditor', () => {
      it('should create content editor role', () => {
        const role = roleTemplates.contentEditor();

        expect(role.name).toBe('Content Editor');
        expect(role.permissions).toEqual(expect.arrayContaining([
          { permission: 'content.create' },
          { permission: 'content.update' },
          { permission: 'content.read' },
          { permission: 'content.list' },
          { permission: 'media.upload' },
          { permission: 'media.read' }
        ]));
      });
    });

    describe('viewer', () => {
      it('should create viewer role with default permissions', () => {
        const role = roleTemplates.viewer();

        expect(role.name).toBe('Viewer');
        expect(role.permissions).toEqual([{ permission: '*.read' }]);
      });

      it('should create viewer role for specific resources', () => {
        const role = roleTemplates.viewer(['users', 'posts']);

        expect(role.permissions).toEqual([
          { permission: 'users.read' },
          { permission: 'posts.read' }
        ]);
      });
    });

    describe('selfManager', () => {
      it('should create self manager role with conditional permissions', () => {
        const role = roleTemplates.selfManager();

        expect(role.name).toBe('Self Manager');
        expect(role.permissions).toHaveLength(3);
        
        // Check that all permissions have userId condition
        role.permissions.forEach(permission => {
          expect(permission.conditions).toEqual([
            { attribute: 'userId', operator: 'equals', value: '${userId}' }
          ]);
        });
      });
    });
  });

  describe('groupTemplates', () => {
    describe('department', () => {
      it('should create department group', () => {
        const group = groupTemplates.department('Engineering');

        expect(group.name).toBe('Engineering Department');
        expect(group.description).toBe('Members of the Engineering department');
        expect(group.members).toEqual([]);
        expect(group.permissions).toEqual([]);
      });

      it('should create department group with permissions', () => {
        const permissions = [{ permission: 'code.*' }];
        const group = groupTemplates.department('Engineering', permissions);

        expect(group.permissions).toEqual(permissions);
      });
    });

    describe('project', () => {
      it('should create project group with default permissions', () => {
        const group = groupTemplates.project('Alpha');

        expect(group.name).toBe('Alpha Project Team');
        expect(group.description).toBe('Members working on the Alpha project');
        expect(group.permissions).toEqual([
          { permission: 'projects.alpha.read' },
          { permission: 'projects.alpha.update' }
        ]);
      });

      it('should create project group with custom permissions', () => {
        const customPermissions = [{ permission: 'custom.permission' }];
        const group = groupTemplates.project('Beta', customPermissions);

        expect(group.permissions).toEqual(customPermissions);
      });
    });

    describe('fullAccess', () => {
      it('should create full access group', () => {
        const group = groupTemplates.fullAccess();

        expect(group.name).toBe('Full Access');
        expect(group.permissions).toEqual([{ permission: '*' }]);
      });
    });

    describe('readOnly', () => {
      it('should create read only group', () => {
        const group = groupTemplates.readOnly();

        expect(group.name).toBe('Read Only');
        expect(group.permissions).toEqual([{ permission: '*.read' }]);
      });
    });
  });

  describe('PermissionTemplateBuilder', () => {
    it('should build basic template', () => {
      const template = new PermissionTemplateBuilder('test-template', 'Test Template')
        .description('A test template')
        .build();

      expect(template).toEqual({
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        permissions: [],
        variables: {}
      });
    });

    it('should build template with permissions', () => {
      const template = new PermissionTemplateBuilder('test-template', 'Test Template')
        .addPermission('users.read')
        .addPermission('users.write', [
          { attribute: 'userId', operator: 'equals', value: '${userId}' }
        ])
        .build();

      expect(template.permissions).toEqual([
        { permission: 'users.read', conditions: undefined },
        { 
          permission: 'users.write', 
          conditions: [{ attribute: 'userId', operator: 'equals', value: '${userId}' }]
        }
      ]);
    });

    it('should build template with variables', () => {
      const template = new PermissionTemplateBuilder('test-template', 'Test Template')
        .addVariable('resource', 'users')
        .addVariable('action', 'read')
        .build();

      expect(template.variables).toEqual({
        resource: 'users',
        action: 'read'
      });
    });

    it('should build template with metadata', () => {
      const template = new PermissionTemplateBuilder('test-template', 'Test Template')
        .addMetadata('category', 'system')
        .addMetadata('version', '1.0')
        .build();

      expect(template.metadata).toEqual({
        category: 'system',
        version: '1.0'
      });
    });

    it('should support method chaining', () => {
      const template = new PermissionTemplateBuilder('test-template', 'Test Template')
        .description('Test')
        .addPermission('test.permission')
        .addVariable('test', 'value')
        .addMetadata('test', 'meta')
        .build();

      expect(template.description).toBe('Test');
      expect(template.permissions).toHaveLength(1);
      expect(template.variables).toHaveProperty('test');
      expect(template.metadata).toHaveProperty('test');
    });
  });

  describe('TemplateManager', () => {
    describe('applyRoleTemplate', () => {
      it('should apply role template successfully', async () => {
        const mockRole = { id: 'test-role', name: 'Test Role' };
        mockConnector.createRole.mockResolvedValue(mockRole as any);

        const result = await templateManager.applyRoleTemplate('admin', 'test-role');

        expect(mockConnector.createRole).toHaveBeenCalledWith({
          id: 'test-role',
          name: 'Administrator',
          description: 'Administrative access to specified resources',
          permissions: [
            { permission: 'users.*' },
            { permission: 'roles.*' },
            { permission: 'groups.*' }
          ]
        });
        expect(result).toBe(mockRole);
      });

      it('should apply role template with options', async () => {
        const mockRole = { id: 'test-role', name: 'Test Role' };
        mockConnector.createRole.mockResolvedValue(mockRole as any);

        await templateManager.applyRoleTemplate('admin', 'test-role', ['posts', 'comments']);

        expect(mockConnector.createRole).toHaveBeenCalledWith({
          id: 'test-role',
          name: 'Administrator',
          description: 'Administrative access to specified resources',
          permissions: [
            { permission: 'posts.*' },
            { permission: 'comments.*' }
          ]
        });
      });
    });

    describe('applyGroupTemplate', () => {
      it('should apply group template successfully', async () => {
        const mockGroup = { id: 'test-group', name: 'Test Group' };
        mockConnector.createGroup.mockResolvedValue(mockGroup as any);

        const result = await templateManager.applyGroupTemplate(
          'department', 
          'test-group', 
          'Engineering'
        );

        expect(mockConnector.createGroup).toHaveBeenCalledWith({
          id: 'test-group',
          name: 'Engineering Department',
          description: 'Members of the Engineering department',
          members: [],
          permissions: []
        });
        expect(result).toBe(mockGroup);
      });

      it('should apply group template with custom permissions', async () => {
        const permissions = [{ permission: 'custom.*' }];
        const mockGroup = { id: 'test-group', name: 'Test Group' };
        mockConnector.createGroup.mockResolvedValue(mockGroup as any);

        await templateManager.applyGroupTemplate(
          'department', 
          'test-group', 
          'Engineering',
          permissions
        );

        expect(mockConnector.createGroup).toHaveBeenCalledWith(
          expect.objectContaining({
            permissions
          })
        );
      });
    });

    describe('createPermissionTemplate', () => {
      it('should create permission template from builder', async () => {
        const builder = new PermissionTemplateBuilder('test-template', 'Test Template')
          .addPermission('test.permission');
        
        const mockTemplate = { id: 'test-template', name: 'Test Template' };
        mockConnector.createTemplate.mockResolvedValue(mockTemplate as any);

        const result = await templateManager.createPermissionTemplate(builder);

        expect(mockConnector.createTemplate).toHaveBeenCalledWith({
          id: 'test-template',
          name: 'Test Template',
          permissions: [{ permission: 'test.permission', conditions: undefined }],
          variables: {}
        });
        expect(result).toBe(mockTemplate);
      });
    });

    describe('applyTemplateVariables', () => {
      it('should replace variables in permission strings', () => {
        const template = {
          id: 'test-template',
          name: 'Test Template',
          permissions: [
            { permission: '${resource}.read' },
            { permission: '${resource}.${action}' }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const variables = { resource: 'users', action: 'write' };

        const result = templateManager.applyTemplateVariables(template, variables);

        expect(result).toEqual([
          { permission: 'users.read' },
          { permission: 'users.write' }
        ]);
      });

      it('should replace variables in condition values', () => {
        const template = {
          id: 'test-template',
          name: 'Test Template',
          permissions: [
            {
              permission: 'documents.read',
              conditions: [
                {
                  attribute: 'document.ownerId',
                  operator: 'equals' as const,
                  value: '${userId}'
                }
              ]
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const variables = { userId: 'user-123' };

        const result = templateManager.applyTemplateVariables(template, variables);

        expect(result[0].conditions![0].value).toBe('user-123');
      });

      it('should preserve non-string condition values', () => {
        const template = {
          id: 'test-template',
          name: 'Test Template',
          permissions: [
            {
              permission: 'test.permission',
              conditions: [
                {
                  attribute: 'score',
                  operator: 'greaterThan' as const,
                  value: 85
                }
              ]
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = templateManager.applyTemplateVariables(template, {});

        expect(result[0].conditions![0].value).toBe(85);
      });

      it('should handle missing variables gracefully', () => {
        const template = {
          id: 'test-template',
          name: 'Test Template',
          permissions: [{ permission: '${missing}.read' }],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = templateManager.applyTemplateVariables(template, {});

        expect(result).toEqual([{ permission: '${missing}.read' }]);
      });
    });

    describe('setupBasicStructure', () => {
      it('should create basic RBAC structure', async () => {
        const mockRole = { id: 'test-role', name: 'Test Role' };
        const mockGroup = { id: 'test-group', name: 'Test Group' };
        
        mockConnector.createRole.mockResolvedValue(mockRole as any);
        mockConnector.createGroup.mockResolvedValue(mockGroup as any);

        const result = await templateManager.setupBasicStructure();

        expect(result.roles).toHaveLength(7); // All basic roles
        expect(result.groups).toHaveLength(4); // All basic groups
        
        // Verify specific roles were created
        expect(mockConnector.createRole).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'super-admin' })
        );
        expect(mockConnector.createRole).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'admin' })
        );
        
        // Verify specific groups were created
        expect(mockConnector.createGroup).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'full-access' })
        );
        expect(mockConnector.createGroup).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'read-only' })
        );
      });
    });
  });

  describe('Factory functions', () => {
    describe('createTemplateManager', () => {
      it('should create template manager with connector', () => {
        const manager = createTemplateManager(mockConnector);

        expect(manager).toBeInstanceOf(TemplateManager);
      });
    });

    describe('createPermissionTemplate', () => {
      it('should create permission template builder', () => {
        const builder = createPermissionTemplate('test-id', 'Test Template');

        expect(builder).toBeInstanceOf(PermissionTemplateBuilder);
        
        const template = builder.build();
        expect(template.id).toBe('test-id');
        expect(template.name).toBe('Test Template');
      });
    });
  });
});