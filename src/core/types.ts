/**
 * Core types for the Gatekeeper RBAC system
 * Inspired by Google IAM with granular permissions
 */

// Permission structure: service.resource.action or resource:action
export type Permission = string;

// Condition for conditional permissions (similar to Google IAM conditions)
export interface PermissionCondition {
  attribute: string;
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'startsWith' | 'endsWith' | 'contains' | 'greaterThan' | 'lessThan';
  value: string | number | boolean | string[] | number[];
}

// A permission with optional conditions
export interface ConditionalPermission {
  permission: Permission;
  conditions?: PermissionCondition[];
  effect?: 'allow' | 'deny'; // Default is 'allow'
}

// User entity
export interface User {
  id: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Group can contain users and other groups (nested structure)
export interface Group {
  id: string;
  name: string;
  description?: string;
  members: (string | Group)[]; // User IDs or nested Groups
  permissions: ConditionalPermission[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Role is a collection of permissions
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: ConditionalPermission[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// User assignments to roles and groups
export interface UserAssignment {
  userId: string;
  roleIds: string[];
  groupIds: string[];
  directPermissions?: ConditionalPermission[]; // Permissions assigned directly to user
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Template for common permission patterns
export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  permissions: ConditionalPermission[];
  variables?: Record<string, string>; // For parameterized templates
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Permission check context
export interface PermissionContext {
  userId: string;
  resource?: string;
  action?: string;
  attributes?: Record<string, any>; // For condition evaluation
  timestamp?: Date;
}

// Permission check result
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  matchedPermissions?: ConditionalPermission[];
  deniedBy?: ConditionalPermission[];
}

// Database connector interface
export interface DatabaseConnector {
  // User operations
  getUser(userId: string): Promise<User | null>;
  createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;

  // Group operations
  getGroup(groupId: string): Promise<Group | null>;
  createGroup(group: Omit<Group, 'createdAt' | 'updatedAt'>): Promise<Group>;
  updateGroup(groupId: string, updates: Partial<Group>): Promise<Group>;
  deleteGroup(groupId: string): Promise<void>;
  getGroupsByUserId(userId: string): Promise<Group[]>;

  // Role operations
  getRole(roleId: string): Promise<Role | null>;
  createRole(role: Omit<Role, 'createdAt' | 'updatedAt'>): Promise<Role>;
  updateRole(roleId: string, updates: Partial<Role>): Promise<Role>;
  deleteRole(roleId: string): Promise<void>;

  // Assignment operations
  getUserAssignment(userId: string): Promise<UserAssignment | null>;
  createUserAssignment(assignment: Omit<UserAssignment, 'createdAt' | 'updatedAt'>): Promise<UserAssignment>;
  updateUserAssignment(userId: string, updates: Partial<UserAssignment>): Promise<UserAssignment>;
  deleteUserAssignment(userId: string): Promise<void>;

  // Template operations
  getTemplate(templateId: string): Promise<PermissionTemplate | null>;
  createTemplate(template: Omit<PermissionTemplate, 'createdAt' | 'updatedAt'>): Promise<PermissionTemplate>;
  updateTemplate(templateId: string, updates: Partial<PermissionTemplate>): Promise<PermissionTemplate>;
  deleteTemplate(templateId: string): Promise<void>;
  listTemplates(): Promise<PermissionTemplate[]>;
}

// Configuration for the RBAC system
export interface RBACConfig {
  connector: DatabaseConnector;
  permissionSeparator?: string; // Default: '.'
  wildcardSupport?: boolean; // Default: true
  cacheEnabled?: boolean; // Default: true
  cacheTTL?: number; // Default: 300 seconds
  strictMode?: boolean; // Default: false (allows undefined permissions)
}

// NextAuth integration types
export interface NextAuthUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
}

export interface NextAuthSession {
  user: NextAuthUser;
  permissions?: Permission[];
  roles?: string[];
  groups?: string[];
  expires: string;
}

export interface NextAuthToken {
  sub: string;
  email?: string;
  name?: string;
  permissions?: Permission[];
  roles?: string[];
  groups?: string[];
}