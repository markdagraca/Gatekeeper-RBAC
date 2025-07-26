import { Permission, ConditionalPermission, Group } from '../core/types';

/**
 * Utility functions for Gatekeeper RBAC
 */

/**
 * Permission utilities
 */
export const permissionUtils = {
  /**
   * Create a resource-based permission
   */
  createPermission(resource: string, action: string, scope?: string): Permission {
    const parts = [resource, action];
    if (scope) {
      parts.push(scope);
    }
    return parts.join('.');
  },

  /**
   * Parse a permission string into components
   */
  parsePermission(permission: Permission): {
    resource?: string;
    action?: string;
    scope?: string;
    parts: string[];
  } {
    const parts = permission.split('.');
    
    switch (parts.length) {
      case 3:
        return {
          resource: parts[0],
          action: parts[1],
          scope: parts[2],
          parts
        };
      case 2:
        return {
          resource: parts[0],
          action: parts[1],
          parts
        };
      case 1:
        return {
          action: parts[0],
          parts
        };
      default:
        return { parts };
    }
  },

  /**
   * Check if a permission matches a pattern
   */
  matchesPattern(permission: Permission, pattern: Permission): boolean {
    if (pattern === '*') return true;
    if (permission === pattern) return true;

    const permParts = permission.split('.');
    const patternParts = pattern.split('.');

    if (patternParts.length > permParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const permPart = permParts[i];

      if (patternPart === '*') {
        return true; // Wildcard matches everything from this point
      }

      if (patternPart !== permPart) {
        return false;
      }
    }

    return patternParts.length === permParts.length;
  },

  /**
   * Generate common CRUD permissions for a resource
   */
  generateCRUDPermissions(resource: string): Permission[] {
    return [
      `${resource}.create`,
      `${resource}.read`,
      `${resource}.update`,
      `${resource}.delete`,
      `${resource}.list`
    ];
  },

  /**
   * Create a conditional permission with common patterns
   */
  createConditionalPermission(
    permission: Permission,
    conditions?: {
      ownerOnly?: boolean;
      userIdAttribute?: string;
      customConditions?: any[];
    }
  ): ConditionalPermission {
    const result: ConditionalPermission = { permission };

    if (conditions) {
      result.conditions = [];

      if (conditions.ownerOnly) {
        result.conditions.push({
          attribute: conditions.userIdAttribute || 'userId',
          operator: 'equals',
          value: '${userId}'
        });
      }

      if (conditions.customConditions) {
        result.conditions.push(...conditions.customConditions);
      }
    }

    return result;
  }
};

/**
 * Group utilities
 */
export const groupUtils = {
  /**
   * Flatten nested groups to get all member user IDs
   */
  flattenGroupMembers(group: Group): string[] {
    const userIds: string[] = [];
    
    function extractUserIds(members: (string | Group)[]) {
      for (const member of members) {
        if (typeof member === 'string') {
          userIds.push(member);
        } else {
          // It's a nested group
          extractUserIds(member.members);
        }
      }
    }

    extractUserIds(group.members);
    return [...new Set(userIds)]; // Remove duplicates
  },

  /**
   * Check if a group contains a user (including nested groups)
   */
  containsUser(group: Group, userId: string): boolean {
    const allUserIds = this.flattenGroupMembers(group);
    return allUserIds.includes(userId);
  },

  /**
   * Get the depth of nested groups
   */
  getGroupDepth(group: Group): number {
    let maxDepth = 0;

    function calculateDepth(members: (string | Group)[], currentDepth: number) {
      for (const member of members) {
        if (typeof member === 'object') {
          // It's a nested group
          const depth = currentDepth + 1;
          maxDepth = Math.max(maxDepth, depth);
          calculateDepth(member.members, depth);
        }
      }
    }

    calculateDepth(group.members, 0);
    return maxDepth;
  }
};

/**
 * Validation utilities
 */
export const validationUtils = {
  /**
   * Validate permission format
   */
  isValidPermission(permission: Permission): boolean {
    if (!permission || typeof permission !== 'string') {
      return false;
    }

    // Check for valid characters (alphanumeric, dots, underscores, hyphens, wildcards)
    const validPattern = /^[a-zA-Z0-9._\-*]+$/;
    return validPattern.test(permission);
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  },

  /**
   * Validate user ID format
   */
  isValidUserId(userId: string): boolean {
    if (!userId || typeof userId !== 'string') {
      return false;
    }
    
    // Allow alphanumeric characters, hyphens, and underscores
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(userId) && userId.length > 0 && userId.length <= 255;
  },

  /**
   * Validate role/group ID format
   */
  isValidId(id: string): boolean {
    return this.isValidUserId(id); // Same validation rules
  }
};

/**
 * Query utilities for complex permission queries
 */
export const queryUtils = {
  /**
   * Build a query to find users with specific permissions
   */
  buildUserPermissionQuery(permissions: Permission[]): any {
    // This would be implementation-specific to the database
    // Returning a generic structure that connectors can adapt
    return {
      type: 'user_permission_query',
      permissions,
      operator: 'OR' // User must have at least one of these permissions
    };
  },

  /**
   * Build a query to find users in specific groups
   */
  buildUserGroupQuery(groupIds: string[]): any {
    return {
      type: 'user_group_query',
      groupIds,
      includeNested: true
    };
  },

  /**
   * Build a query to find users with specific roles
   */
  buildUserRoleQuery(roleIds: string[]): any {
    return {
      type: 'user_role_query',
      roleIds,
      operator: 'OR'
    };
  }
};

/**
 * Cache utilities
 */
export const cacheUtils = {
  /**
   * Generate cache key for user permissions
   */
  userPermissionKey(userId: string): string {
    return `user_permissions:${userId}`;
  },

  /**
   * Generate cache key for user roles
   */
  userRolesKey(userId: string): string {
    return `user_roles:${userId}`;
  },

  /**
   * Generate cache key for user groups
   */
  userGroupsKey(userId: string): string {
    return `user_groups:${userId}`;
  },

  /**
   * Check if cache entry is expired
   */
  isExpired(timestamp: number, ttlSeconds: number): boolean {
    return Date.now() > timestamp + (ttlSeconds * 1000);
  }
};

/**
 * Migration utilities for data transformation
 */
export const migrationUtils = {
  /**
   * Convert simple permissions array to conditional permissions
   */
  convertToConditionalPermissions(permissions: Permission[]): ConditionalPermission[] {
    return permissions.map(permission => ({ permission }));
  },

  /**
   * Extract permissions from legacy role format
   */
  extractPermissionsFromLegacyRoles(legacyRoles: any[]): ConditionalPermission[] {
    const permissions: ConditionalPermission[] = [];
    
    for (const role of legacyRoles) {
      if (role.permissions && Array.isArray(role.permissions)) {
        permissions.push(...this.convertToConditionalPermissions(role.permissions));
      }
    }

    return permissions;
  },

  /**
   * Normalize permission strings
   */
  normalizePermissions(permissions: Permission[]): Permission[] {
    return permissions
      .map(p => p.toLowerCase().trim())
      .filter((p, index, arr) => arr.indexOf(p) === index); // Remove duplicates
  }
};

/**
 * Debug utilities
 */
export const debugUtils = {
  /**
   * Log permission check details
   */
  logPermissionCheck(
    userId: string,
    permission: Permission,
    result: boolean,
    details?: any
  ): void {
    console.log(`[Gatekeeper] Permission check:`, {
      userId,
      permission,
      allowed: result,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  /**
   * Analyze permission patterns for optimization
   */
  analyzePermissionPatterns(permissions: Permission[]): {
    wildcards: number;
    specific: number;
    resources: Set<string>;
    actions: Set<string>;
  } {
    const analysis = {
      wildcards: 0,
      specific: 0,
      resources: new Set<string>(),
      actions: new Set<string>()
    };

    for (const permission of permissions) {
      if (permission.includes('*')) {
        analysis.wildcards++;
      } else {
        analysis.specific++;
      }

      const parsed = permissionUtils.parsePermission(permission);
      if (parsed.resource) {
        analysis.resources.add(parsed.resource);
      }
      if (parsed.action) {
        analysis.actions.add(parsed.action);
      }
    }

    return analysis;
  }
};

// Export all utilities as a combined object
export const utils = {
  permission: permissionUtils,
  group: groupUtils,
  validation: validationUtils,
  query: queryUtils,
  cache: cacheUtils,
  migration: migrationUtils,
  debug: debugUtils
};