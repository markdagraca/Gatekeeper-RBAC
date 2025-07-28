import {
  Group,
  Role,
  Permission,
  ConditionalPermission,
  PermissionContext,
  PermissionResult,
  DatabaseConnector,
  RBACConfig
} from './types';
import { PermissionEngine } from './permission-engine';

/**
 * Main RBAC class that orchestrates permission checking
 * Handles user resolution, group membership, role assignments, and caching
 */
export class RBAC {
  private engine: PermissionEngine;
  private connector: DatabaseConnector;
  private config: RBACConfig;
  private cache: Map<string, { data: any; expires: number }> = new Map();

  constructor(config: RBACConfig) {
    this.config = {
      cacheEnabled: false, // Disabled by default for immediate updates
      cacheTTL: 300, // 5 minutes
      ...config
    };
    this.connector = config.connector;
    this.engine = new PermissionEngine(this.config);
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    userId: string,
    permission: Permission,
    context?: Partial<PermissionContext>
  ): Promise<PermissionResult> {
    const fullContext: PermissionContext = {
      userId,
      timestamp: new Date(),
      ...context
    };

    // Get user's effective permissions
    const userPermissions = await this.getUserEffectivePermissions(userId);
    
    // Normalize the required permission
    const normalizedPermission = this.engine.normalizePermission(permission);

    // Evaluate permissions
    return this.engine.evaluatePermissions(
      normalizedPermission,
      userPermissions,
      fullContext
    );
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    userId: string,
    permissions: Permission[],
    context?: Partial<PermissionContext>
  ): Promise<Record<Permission, PermissionResult>> {
    const results: Record<Permission, PermissionResult> = {};
    
    // Get user's effective permissions once
    const userPermissions = await this.getUserEffectivePermissions(userId);
    
    const fullContext: PermissionContext = {
      userId,
      timestamp: new Date(),
      ...context
    };

    for (const permission of permissions) {
      const normalizedPermission = this.engine.normalizePermission(permission);
      results[permission] = this.engine.evaluatePermissions(
        normalizedPermission,
        userPermissions,
        fullContext
      );
    }

    return results;
  }

  /**
   * Get all effective permissions for a user (including from groups and roles)
   */
  async getUserEffectivePermissions(userId: string): Promise<ConditionalPermission[]> {
    const cacheKey = `user_permissions:${userId}`;
    
    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache<ConditionalPermission[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const permissions: ConditionalPermission[] = [];

    // Get user assignment
    const assignment = await this.connector.getUserAssignment(userId);
    if (!assignment) {
      return permissions;
    }

    // Add direct permissions
    if (assignment.directPermissions) {
      permissions.push(...assignment.directPermissions);
    }

    // Add permissions from roles
    for (const roleId of assignment.roleIds) {
      const role = await this.connector.getRole(roleId);
      if (role) {
        permissions.push(...role.permissions);
      }
    }

    // Add permissions from groups (including nested groups)
    const groupPermissions = await this.getGroupPermissions(assignment.groupIds);
    permissions.push(...groupPermissions);

    // Cache the result
    if (this.config.cacheEnabled) {
      this.setCache(cacheKey, permissions);
    }

    return permissions;
  }

  /**
   * Get permissions from groups (handles nested groups)
   */
  private async getGroupPermissions(groupIds: string[]): Promise<ConditionalPermission[]> {
    const permissions: ConditionalPermission[] = [];
    const processedGroups = new Set<string>();

    const processGroup = async (groupId: string): Promise<void> => {
      if (processedGroups.has(groupId)) {
        return; // Avoid circular references
      }
      processedGroups.add(groupId);

      const group = await this.connector.getGroup(groupId);
      if (!group) {
        return;
      }

      // Add group's permissions
      permissions.push(...group.permissions);

      // Process nested groups
      for (const member of group.members) {
        if (typeof member === 'object' && 'id' in member) {
          // It's a nested group
          await processGroup(member.id);
        }
      }
    };

    // Process all groups
    for (const groupId of groupIds) {
      await processGroup(groupId);
    }

    return permissions;
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const assignment = await this.connector.getUserAssignment(userId);
    if (!assignment) {
      return [];
    }

    const roles: Role[] = [];
    for (const roleId of assignment.roleIds) {
      const role = await this.connector.getRole(roleId);
      if (role) {
        roles.push(role);
      }
    }

    return roles;
  }

  /**
   * Get user's groups (including nested)
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    const assignment = await this.connector.getUserAssignment(userId);
    if (!assignment) {
      return [];
    }

    const groups: Group[] = [];
    const processedGroups = new Set<string>();

    const processGroup = async (groupId: string): Promise<void> => {
      if (processedGroups.has(groupId)) {
        return;
      }
      processedGroups.add(groupId);

      const group = await this.connector.getGroup(groupId);
      if (!group) {
        return;
      }

      groups.push(group);

      // Process nested groups
      for (const member of group.members) {
        if (typeof member === 'object' && 'id' in member) {
          await processGroup(member.id);
        }
      }
    };

    for (const groupId of assignment.groupIds) {
      await processGroup(groupId);
    }

    return groups;
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    let assignment = await this.connector.getUserAssignment(userId);
    
    if (!assignment) {
      assignment = await this.connector.createUserAssignment({
        userId,
        roleIds: [roleId],
        groupIds: []
      });
    } else {
      if (!assignment.roleIds.includes(roleId)) {
        assignment.roleIds.push(roleId);
        await this.connector.updateUserAssignment(userId, {
          roleIds: assignment.roleIds
        });
      }
    }

    // Clear cache
    this.clearUserCache(userId);
  }

  /**
   * Remove role from user
   */
  async unassignRole(userId: string, roleId: string): Promise<void> {
    const assignment = await this.connector.getUserAssignment(userId);
    if (!assignment) {
      return;
    }

    const newRoleIds = assignment.roleIds.filter(id => id !== roleId);
    await this.connector.updateUserAssignment(userId, {
      roleIds: newRoleIds
    });

    this.clearUserCache(userId);
  }

  /**
   * Add user to group
   */
  async addUserToGroup(userId: string, groupId: string): Promise<void> {
    let assignment = await this.connector.getUserAssignment(userId);
    
    if (!assignment) {
      assignment = await this.connector.createUserAssignment({
        userId,
        roleIds: [],
        groupIds: [groupId]
      });
    } else {
      if (!assignment.groupIds.includes(groupId)) {
        assignment.groupIds.push(groupId);
        await this.connector.updateUserAssignment(userId, {
          groupIds: assignment.groupIds
        });
      }
    }

    this.clearUserCache(userId);
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    const assignment = await this.connector.getUserAssignment(userId);
    if (!assignment) {
      return;
    }

    const newGroupIds = assignment.groupIds.filter(id => id !== groupId);
    await this.connector.updateUserAssignment(userId, {
      groupIds: newGroupIds
    });

    this.clearUserCache(userId);
  }

  /**
   * Grant direct permission to user
   */
  async grantPermission(userId: string, permission: ConditionalPermission): Promise<void> {
    let assignment = await this.connector.getUserAssignment(userId);
    
    if (!assignment) {
      assignment = await this.connector.createUserAssignment({
        userId,
        roleIds: [],
        groupIds: [],
        directPermissions: [permission]
      });
    } else {
      const directPermissions = assignment.directPermissions || [];
      directPermissions.push(permission);
      await this.connector.updateUserAssignment(userId, {
        directPermissions
      });
    }

    this.clearUserCache(userId);
  }

  /**
   * Revoke direct permission from user
   */
  async revokePermission(userId: string, permission: Permission): Promise<void> {
    const assignment = await this.connector.getUserAssignment(userId);
    if (!assignment || !assignment.directPermissions) {
      return;
    }

    const directPermissions = assignment.directPermissions.filter(
      p => p.permission !== permission
    );
    
    await this.connector.updateUserAssignment(userId, {
      directPermissions
    });

    this.clearUserCache(userId);
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache<T>(key: string, data: T): void {
    const expires = Date.now() + (this.config.cacheTTL! * 1000);
    this.cache.set(key, { data, expires });
  }

  private clearUserCache(userId: string): void {
    const prefix = `user_permissions:${userId}`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}