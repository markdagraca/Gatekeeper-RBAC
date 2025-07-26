import {
  Role,
  Group,
  ConditionalPermission,
  PermissionTemplate,
  DatabaseConnector
} from '../core/types';

/**
 * Template system for common RBAC patterns
 * Provides pre-built roles, groups, and permission sets
 */

// Common permission patterns
export const commonPermissions = {
  // Basic CRUD operations
  create: (resource: string) => `${resource}.create`,
  read: (resource: string) => `${resource}.read`,
  update: (resource: string) => `${resource}.update`,
  delete: (resource: string) => `${resource}.delete`,
  list: (resource: string) => `${resource}.list`,

  // Administrative operations
  admin: (resource: string) => `${resource}.admin`,
  manage: (resource: string) => `${resource}.manage`,
  
  // Wildcard permissions
  all: (resource: string) => `${resource}.*`,
  everything: () => '*',

  // User-specific operations
  own: (resource: string, action: string) => `${resource}.${action}.own`,
  
  // System-level permissions
  system: {
    admin: 'system.admin',
    manage: 'system.manage',
    view: 'system.view'
  }
};

// Pre-defined role templates
export const roleTemplates = {
  // Administrative roles
  superAdmin: (): Omit<Role, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: [
      { permission: '*' }
    ]
  }),

  admin: (resources?: string[]): Omit<Role, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'Administrator',
    description: 'Administrative access to specified resources',
    permissions: resources ? resources.map(resource => ({ permission: `${resource}.*` })) : [
      { permission: 'users.*' },
      { permission: 'roles.*' },
      { permission: 'groups.*' }
    ]
  }),

  // User management roles
  userManager: (): Omit<Role, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'User Manager',
    description: 'Can manage users and their assignments',
    permissions: [
      { permission: 'users.create' },
      { permission: 'users.read' },
      { permission: 'users.update' },
      { permission: 'users.list' },
      { permission: 'assignments.create' },
      { permission: 'assignments.update' },
      { permission: 'assignments.read' }
    ]
  }),

  // Content management roles
  contentManager: (): Omit<Role, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'Content Manager',
    description: 'Can manage content and media',
    permissions: [
      { permission: 'content.*' },
      { permission: 'media.*' },
      { permission: 'categories.read' },
      { permission: 'categories.list' }
    ]
  }),

  contentEditor: (): Omit<Role, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'Content Editor',
    description: 'Can create and edit content',
    permissions: [
      { permission: 'content.create' },
      { permission: 'content.update' },
      { permission: 'content.read' },
      { permission: 'content.list' },
      { permission: 'media.upload' },
      { permission: 'media.read' }
    ]
  }),

  // Viewer roles
  viewer: (resources?: string[]): Omit<Role, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'Viewer',
    description: 'Read-only access to specified resources',
    permissions: resources ? resources.map(resource => ({ permission: `${resource}.read` })) : [
      { permission: '*.read' }
    ]
  }),

  // Self-management role
  selfManager: (): Omit<Role, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'Self Manager',
    description: 'Can manage own profile and data',
    permissions: [
      { 
        permission: 'users.read.own',
        conditions: [
          { attribute: 'userId', operator: 'equals', value: '${userId}' }
        ]
      },
      { 
        permission: 'users.update.own',
        conditions: [
          { attribute: 'userId', operator: 'equals', value: '${userId}' }
        ]
      },
      { 
        permission: 'profile.update',
        conditions: [
          { attribute: 'userId', operator: 'equals', value: '${userId}' }
        ]
      }
    ]
  })
};

// Pre-defined group templates
export const groupTemplates = {
  // Department-based groups
  department: (name: string, permissions?: ConditionalPermission[]): Omit<Group, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: `${name} Department`,
    description: `Members of the ${name} department`,
    members: [],
    permissions: permissions || []
  }),

  // Project-based groups
  project: (name: string, permissions?: ConditionalPermission[]): Omit<Group, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: `${name} Project Team`,
    description: `Members working on the ${name} project`,
    members: [],
    permissions: permissions || [
      { permission: `projects.${name.toLowerCase()}.read` },
      { permission: `projects.${name.toLowerCase()}.update` }
    ]
  }),

  // Access level groups
  fullAccess: (): Omit<Group, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'Full Access',
    description: 'Users with full system access',
    members: [],
    permissions: [{ permission: '*' }]
  }),

  readOnly: (): Omit<Group, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: 'Read Only',
    description: 'Users with read-only access',
    members: [],
    permissions: [{ permission: '*.read' }]
  })
};

// Permission template builder
export class PermissionTemplateBuilder {
  private template: Partial<PermissionTemplate>;

  constructor(id: string, name: string) {
    this.template = {
      id,
      name,
      permissions: [],
      variables: {}
    };
  }

  description(description: string): this {
    this.template.description = description;
    return this;
  }

  addPermission(permission: string, conditions?: any[]): this {
    this.template.permissions = this.template.permissions || [];
    this.template.permissions.push({
      permission,
      conditions
    });
    return this;
  }

  addVariable(name: string, defaultValue: string): this {
    this.template.variables = this.template.variables || {};
    this.template.variables[name] = defaultValue;
    return this;
  }

  addMetadata(key: string, value: any): this {
    this.template.metadata = this.template.metadata || {};
    this.template.metadata[key] = value;
    return this;
  }

  build(): Omit<PermissionTemplate, 'createdAt' | 'updatedAt'> {
    return this.template as Omit<PermissionTemplate, 'createdAt' | 'updatedAt'>;
  }
}

// Template manager for applying templates
export class TemplateManager {
  constructor(private connector: DatabaseConnector) {}

  /**
   * Apply a role template
   */
  async applyRoleTemplate(
    templateName: keyof typeof roleTemplates,
    roleId: string,
    options?: any
  ): Promise<Role> {
    const template = roleTemplates[templateName](options);
    return this.connector.createRole({
      id: roleId,
      ...template
    });
  }

  /**
   * Apply a group template
   */
  async applyGroupTemplate(
    templateName: keyof typeof groupTemplates,
    groupId: string,
    name: string,
    permissions?: ConditionalPermission[]
  ): Promise<Group> {
    const template = groupTemplates[templateName](name, permissions);
    return this.connector.createGroup({
      id: groupId,
      ...template
    });
  }

  /**
   * Create a permission template
   */
  async createPermissionTemplate(
    builder: PermissionTemplateBuilder
  ): Promise<PermissionTemplate> {
    const template = builder.build();
    return this.connector.createTemplate(template);
  }

  /**
   * Apply variables to a permission template
   */
  applyTemplateVariables(
    template: PermissionTemplate,
    variables: Record<string, string>
  ): ConditionalPermission[] {
    return template.permissions.map(permission => ({
      ...permission,
      permission: this.replaceVariables(permission.permission, variables),
      conditions: permission.conditions?.map(condition => ({
        ...condition,
        value: typeof condition.value === 'string' 
          ? this.replaceVariables(condition.value, variables)
          : condition.value
      }))
    }));
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
      return variables[variableName] || match;
    });
  }

  /**
   * Setup common RBAC structure for typical applications
   */
  async setupBasicStructure(): Promise<{
    roles: Role[];
    groups: Group[];
  }> {
    const roles = await Promise.all([
      this.applyRoleTemplate('superAdmin', 'super-admin'),
      this.applyRoleTemplate('admin', 'admin'),
      this.applyRoleTemplate('userManager', 'user-manager'),
      this.applyRoleTemplate('contentManager', 'content-manager'),
      this.applyRoleTemplate('contentEditor', 'content-editor'),
      this.applyRoleTemplate('viewer', 'viewer'),
      this.applyRoleTemplate('selfManager', 'self-manager')
    ]);

    const groups = await Promise.all([
      this.applyGroupTemplate('fullAccess', 'full-access', 'Full Access'),
      this.applyGroupTemplate('readOnly', 'read-only', 'Read Only'),
      this.applyGroupTemplate('department', 'it-department', 'IT'),
      this.applyGroupTemplate('department', 'marketing-department', 'Marketing')
    ]);

    return { roles, groups };
  }
}

// Export utility functions
export function createTemplateManager(connector: DatabaseConnector): TemplateManager {
  return new TemplateManager(connector);
}

export function createPermissionTemplate(id: string, name: string): PermissionTemplateBuilder {
  return new PermissionTemplateBuilder(id, name);
}