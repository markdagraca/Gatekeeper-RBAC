import type { JWT } from 'next-auth/jwt';
import type { Session, User } from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';
import { RBAC } from '../core/rbac';
import { Permission, NextAuthSession, NextAuthToken } from '../core/types';

/**
 * NextAuth integration for Gatekeeper RBAC
 * Provides callbacks and utilities for seamless integration
 */

export interface GatekeeperNextAuthConfig {
  rbac: RBAC;
  includePermissionsInSession?: boolean;
  includeRolesInSession?: boolean;
  includeGroupsInSession?: boolean;
  sessionCacheTTL?: number; // seconds
}

/**
 * Creates NextAuth callbacks that integrate with Gatekeeper RBAC
 */
export function createGatekeeperCallbacks(config: GatekeeperNextAuthConfig) {
  const {
    rbac,
    includePermissionsInSession = true,
    includeRolesInSession = true,
    includeGroupsInSession = true,
    sessionCacheTTL = 300
  } = config;

  // Cache TTL for future use
  const _cacheTTL = sessionCacheTTL;

  return {
    async jwt({ token, user, account: _account, profile: _profile, isNewUser: _isNewUser }: any): Promise<JWT> {
      // On sign in, add RBAC data to token
      if (user) {
        const gatekeeperToken = token as NextAuthToken;
        gatekeeperToken.sub = user.id;
        gatekeeperToken.email = user.email;
        gatekeeperToken.name = user.name;

        try {
          // Get user's permissions, roles, and groups
          if (includePermissionsInSession) {
            const permissions = await rbac.getUserEffectivePermissions(user.id);
            gatekeeperToken.permissions = permissions.map(p => p.permission);
          }

          if (includeRolesInSession) {
            const roles = await rbac.getUserRoles(user.id);
            gatekeeperToken.roles = roles.map(r => r.id);
          }

          if (includeGroupsInSession) {
            const groups = await rbac.getUserGroups(user.id);
            gatekeeperToken.groups = groups.map(g => g.id);
          }
        } catch (error) {
          console.error('Error loading RBAC data for user:', error);
        }
      }

      return token;
    },

    async session({ session, token }: any): Promise<Session> {
      const gatekeeperSession = session as NextAuthSession;
      const gatekeeperToken = token as NextAuthToken;

      if (gatekeeperToken.sub) {
        gatekeeperSession.user.id = gatekeeperToken.sub;
        
        if (gatekeeperToken.permissions) {
          gatekeeperSession.permissions = gatekeeperToken.permissions;
        }

        if (gatekeeperToken.roles) {
          gatekeeperSession.roles = gatekeeperToken.roles;
        }

        if (gatekeeperToken.groups) {
          gatekeeperSession.groups = gatekeeperToken.groups;
        }
      }

      return gatekeeperSession;
    }
  };
}

/**
 * Higher-order component for protecting pages with permissions
 * Note: This function returns a React component and should be used in .tsx files
 */
export function withPermission<P extends Record<string, unknown>>(
  Component: any,
  requiredPermission: Permission,
  options?: {
    fallback?: any;
    redirectTo?: string;
  }
) {
  return function ProtectedComponent(props: P) {
    const { useSession } = require('next-auth/react');
    const { data: session, status } = useSession();
    const React = require('react');

    if (status === 'loading') {
      return options?.fallback 
        ? React.createElement(options.fallback) 
        : React.createElement('div', null, 'Loading...');
    }

    if (status === 'unauthenticated') {
      if (options?.redirectTo) {
        const { useRouter } = require('next/router');
        const router = useRouter();
        router.push(options.redirectTo);
        return null;
      }
      return options?.fallback 
        ? React.createElement(options.fallback) 
        : React.createElement('div', null, 'Access Denied');
    }

    const gatekeeperSession = session as NextAuthSession;
    const hasPermission = gatekeeperSession.permissions?.includes(requiredPermission) || false;

    if (!hasPermission) {
      return options?.fallback 
        ? React.createElement(options.fallback) 
        : React.createElement('div', null, 'Access Denied');
    }

    return React.createElement(Component, props);
  };
}

/**
 * Hook for checking permissions in React components
 */
export function useGatekeeperPermissions() {
  const { useSession } = require('next-auth/react');
  const { data: session } = useSession();
  const gatekeeperSession = session as NextAuthSession | null;

  const hasPermission = (permission: Permission): boolean => {
    return gatekeeperSession?.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const hasRole = (roleId: string): boolean => {
    return gatekeeperSession?.roles?.includes(roleId) || false;
  };

  const hasAnyRole = (roleIds: string[]): boolean => {
    return roleIds.some(roleId => hasRole(roleId));
  };

  const inGroup = (groupId: string): boolean => {
    return gatekeeperSession?.groups?.includes(groupId) || false;
  };

  const inAnyGroup = (groupIds: string[]): boolean => {
    return groupIds.some(groupId => inGroup(groupId));
  };

  return {
    permissions: gatekeeperSession?.permissions || [],
    roles: gatekeeperSession?.roles || [],
    groups: gatekeeperSession?.groups || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    inGroup,
    inAnyGroup
  };
}

/**
 * Server-side permission checking for API routes and SSR
 */
export async function checkServerPermission(
  rbac: RBAC,
  userId: string,
  permission: Permission,
  context?: any
): Promise<boolean> {
  try {
    const result = await rbac.hasPermission(userId, permission, context);
    return result.allowed;
  } catch (error) {
    console.error('Error checking server permission:', error);
    return false;
  }
}

/**
 * Middleware helper for protecting API routes
 */
export function createPermissionMiddleware(rbac: RBAC) {
  return function requirePermission(permission: Permission) {
    return async function middleware(req: any, res: any, next: any) {
      const { getServerSession } = require('next-auth/next');
      const session = await getServerSession(req, res, {} /* your auth options */);

      if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasPermission = await checkServerPermission(
        rbac,
        session.user.id,
        permission,
        { req, res }
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return next();
    };
  };
}

/**
 * Utility for creating RBAC-aware API route handlers
 */
export function withRBAC(rbac: RBAC) {
  return function createProtectedHandler(
    permissions: Permission | Permission[],
    handler: (req: any, res: any, session: NextAuthSession) => Promise<any>
  ) {
    return async function protectedHandler(req: any, res: any) {
      const { getServerSession } = require('next-auth/next');
      const session = await getServerSession(req, res, {} /* your auth options */);

      if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
      
      for (const permission of requiredPermissions) {
        const hasPermission = await checkServerPermission(
          rbac,
          session.user.id,
          permission,
          { req, res }
        );

        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Forbidden',
            requiredPermission: permission
          });
        }
      }

      return handler(req, res, session as NextAuthSession);
    };
  };
}

/**
 * Helper to sync NextAuth users with Gatekeeper users
 */
export async function syncUserWithGatekeeper(
  rbac: RBAC,
  nextAuthUser: User | AdapterUser
): Promise<void> {
  try {
    // Check if user exists in Gatekeeper
    const existingUser = await rbac['connector'].getUser(nextAuthUser.id);
    
    if (!existingUser) {
      // Create new user in Gatekeeper
      await rbac['connector'].createUser({
        id: nextAuthUser.id,
        email: nextAuthUser.email || undefined,
        name: nextAuthUser.name || undefined,
        metadata: {
          image: (nextAuthUser as any).image
        }
      });
    } else {
      // Update existing user
      await rbac['connector'].updateUser(nextAuthUser.id, {
        email: nextAuthUser.email || existingUser.email,
        name: nextAuthUser.name || existingUser.name,
        metadata: {
          ...existingUser.metadata,
          image: (nextAuthUser as any).image
        }
      });
    }
  } catch (error) {
    console.error('Error syncing user with Gatekeeper:', error);
  }
}