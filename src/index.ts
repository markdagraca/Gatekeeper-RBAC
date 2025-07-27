/**
 * Gatekeeper RBAC - A flexible, granular role-based access control library
 * 
 * Features:
 * - Google IAM-style granular permissions with wildcard support
 * - Nested groups and hierarchical role management
 * - Conditional permissions with context-aware evaluation
 * - Database-agnostic with connector pattern
 * - NextAuth.js integration for seamless authentication
 * - Pre-built templates for common RBAC patterns
 * - TypeScript first with comprehensive type safety
 */

// Core exports
export { RBAC } from './core/rbac';
export { PermissionEngine } from './core/permission-engine';

// Import for factory function and default export
import { RBAC } from './core/rbac';
import { PermissionEngine } from './core/permission-engine';
import { RBACConfig } from './core/types';
import { FirebaseConnector, createFirebaseConnector } from './connectors/firebase';
import { createGatekeeperCallbacks } from './nextauth';
import { createTemplateManager } from './templates';

// Types
export type {
  // Core types
  Permission,
  ConditionalPermission,
  PermissionCondition,
  PermissionContext,
  PermissionResult,
  RBACConfig,
  
  // Entity types
  User,
  Group,
  Role,
  UserAssignment,
  PermissionTemplate,
  
  // Database types
  DatabaseConnector,
  
  // NextAuth types
  NextAuthUser,
  NextAuthSession,
  NextAuthToken
} from './core/types';

// Database connectors
export { FirebaseConnector, createFirebaseConnector } from './connectors/firebase';

// NextAuth integration
export {
  createGatekeeperCallbacks,
  withPermission,
  useGatekeeperPermissions,
  checkServerPermission,
  createPermissionMiddleware,
  withRBAC,
  syncUserWithGatekeeper,
  // New Next.js utilities
  createNextjsMiddleware,
  getServerPermissions,
  getServerSidePermissions,
  withPermissions,
  requireAuth
} from './nextauth';

// Templates
export {
  commonPermissions,
  roleTemplates,
  groupTemplates,
  PermissionTemplateBuilder,
  TemplateManager,
  createTemplateManager,
  createPermissionTemplate
} from './templates';

// Utilities
export {
  permissionUtils,
  groupUtils,
  validationUtils,
  queryUtils,
  cacheUtils,
  migrationUtils,
  debugUtils,
  utils
} from './utils';

// Re-export for convenience
export { GatekeeperNextAuthConfig } from './nextauth';

/**
 * Quick start factory function
 */
export function createGatekeeper(config: RBACConfig): RBAC {
  return new RBAC(config);
}

/**
 * Version information
 */
export const version = '1.0.0';

/**
 * Library information
 */
export const info = {
  name: 'gatekeeper-rbac',
  version: '1.0.0',
  description: 'A flexible, granular role-based access control library for TypeScript with NextAuth integration',
  author: 'Gatekeeper Contributors',
  license: 'MIT'
};

// Default export for convenience
export default {
  RBAC,
  PermissionEngine,
  FirebaseConnector,
  createGatekeeper,
  createFirebaseConnector,
  createGatekeeperCallbacks,
  createTemplateManager,
  version,
  info
};