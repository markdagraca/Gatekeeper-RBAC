import {
  Permission,
  ConditionalPermission,
  PermissionCondition,
  PermissionContext,
  PermissionResult,
  RBACConfig
} from './types';

/**
 * Core permission evaluation engine
 * Handles wildcard matching, conditions, and hierarchical permission evaluation
 */
export class PermissionEngine {
  private config: RBACConfig;

  constructor(config: RBACConfig) {
    this.config = {
      permissionSeparator: '.',
      wildcardSupport: true,
      strictMode: false,
      ...config
    };
  }

  /**
   * Check if a permission matches a required permission with wildcard support
   */
  public matchesPermission(required: Permission, granted: Permission): boolean {
    if (required === granted) {
      return true;
    }

    if (!this.config.wildcardSupport) {
      return false;
    }

    // Handle wildcards
    if (granted.includes('*')) {
      return this.matchesWildcard(required, granted);
    }

    return false;
  }

  /**
   * Wildcard matching logic
   * Supports patterns like:
   * - users.* (matches users.read, users.write, etc.)
   * - users.*.read (matches users.john.read, users.jane.read, etc.)
   * - * (matches everything)
   */
  private matchesWildcard(required: Permission, pattern: Permission): boolean {
    const separator = this.config.permissionSeparator!;
    
    // Handle universal wildcard
    if (pattern === '*') {
      return true;
    }
    
    // Convert pattern to regex
    const regexPattern = pattern
      .split(separator)
      .map(part => {
        if (part === '*') {
          return '[^' + separator.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&') + ']+';
        }
        return part.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&');
      })
      .join('\\' + separator);

    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(required);
  }

  /**
   * Evaluate conditions for a permission
   */
  public evaluateConditions(
    conditions: PermissionCondition[],
    context: PermissionContext
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    return conditions.every(condition => this.evaluateCondition(condition, context));
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: PermissionCondition,
    context: PermissionContext
  ): boolean {
    const contextValue = this.getContextValue(condition.attribute, context);
    
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      
      case 'notEquals':
        return contextValue !== condition.value;
      
      case 'in':
        return Array.isArray(condition.value) && 
               (condition.value as any[]).includes(contextValue);
      
      case 'notIn':
        return Array.isArray(condition.value) && 
               !(condition.value as any[]).includes(contextValue);
      
      case 'startsWith':
        return typeof contextValue === 'string' && 
               typeof condition.value === 'string' &&
               contextValue.startsWith(condition.value);
      
      case 'endsWith':
        return typeof contextValue === 'string' && 
               typeof condition.value === 'string' &&
               contextValue.endsWith(condition.value);
      
      case 'contains':
        return typeof contextValue === 'string' && 
               typeof condition.value === 'string' &&
               contextValue.includes(condition.value);
      
      case 'greaterThan':
        return typeof contextValue === 'number' && 
               typeof condition.value === 'number' &&
               contextValue > condition.value;
      
      case 'lessThan':
        return typeof contextValue === 'number' && 
               typeof condition.value === 'number' &&
               contextValue < condition.value;
      
      default:
        return false;
    }
  }

  /**
   * Get value from context using dot notation
   */
  private getContextValue(attribute: string, context: PermissionContext): any {
    const parts = attribute.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate a list of conditional permissions against a required permission
   */
  public evaluatePermissions(
    requiredPermission: Permission,
    conditionalPermissions: ConditionalPermission[],
    context: PermissionContext
  ): PermissionResult {
    const matchedPermissions: ConditionalPermission[] = [];
    const deniedBy: ConditionalPermission[] = [];
    let allowed = false;

    for (const conditionalPerm of conditionalPermissions) {
      // Check if permission matches
      if (this.matchesPermission(requiredPermission, conditionalPerm.permission)) {
        // Check conditions
        const conditionsMatch = this.evaluateConditions(
          conditionalPerm.conditions || [],
          context
        );

        if (conditionsMatch) {
          matchedPermissions.push(conditionalPerm);

          // Handle effect
          const effect = conditionalPerm.effect || 'allow';
          if (effect === 'allow') {
            allowed = true;
          } else if (effect === 'deny') {
            deniedBy.push(conditionalPerm);
            allowed = false; // Deny overrides allow
            break; // Stop processing on explicit deny
          }
        }
      }
    }

    // In strict mode, require explicit permission
    if (this.config.strictMode && matchedPermissions.length === 0) {
      allowed = false;
    }

    return {
      allowed,
      matchedPermissions,
      deniedBy: deniedBy.length > 0 ? deniedBy : undefined,
      reason: this.getResultReason(allowed, matchedPermissions, deniedBy)
    };
  }

  /**
   * Generate human-readable reason for permission result
   */
  private getResultReason(
    allowed: boolean,
    matched: ConditionalPermission[],
    denied: ConditionalPermission[]
  ): string {
    if (denied.length > 0) {
      return `Access denied by explicit deny rule: ${denied[0].permission}`;
    }

    if (allowed && matched.length > 0) {
      return `Access granted by permission: ${matched[0].permission}`;
    }

    if (!allowed && this.config.strictMode) {
      return 'Access denied: No matching permissions found (strict mode)';
    }

    if (!allowed) {
      return 'Access denied: No matching permissions found';
    }

    return 'Access granted';
  }

  /**
   * Normalize permission format
   */
  public normalizePermission(permission: Permission): Permission {
    // Remove extra separators and trim
    const separator = this.config.permissionSeparator!;
    return permission
      .split(separator)
      .filter(part => part.length > 0)
      .join(separator)
      .toLowerCase();
  }

  /**
   * Parse permission into components
   */
  public parsePermission(permission: Permission): {
    service?: string;
    resource?: string;
    action?: string;
    components: string[];
  } {
    const separator = this.config.permissionSeparator!;
    const components = permission.split(separator);

    // Handle different patterns:
    // - service.resource.action
    // - resource.action  
    // - action
    switch (components.length) {
      case 3:
        return {
          service: components[0],
          resource: components[1],
          action: components[2],
          components
        };
      case 2:
        return {
          resource: components[0],
          action: components[1],
          components
        };
      case 1:
        return {
          action: components[0],
          components
        };
      default:
        return { components };
    }
  }
}