/**
 * NextAuth Integration Example
 * 
 * This example demonstrates:
 * - Integrating Gatekeeper with NextAuth
 * - Setting up callbacks for JWT and session
 * - Using hooks and HOCs for permission checking
 * - Protecting API routes with permissions
 */

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { 
  createGatekeeper,
  createFirebaseConnector,
  createGatekeeperCallbacks,
  syncUserWithGatekeeper
} from 'gatekeeper-rbac';

// Initialize your database connector
const connector = createFirebaseConnector(/* your firestore instance */);
const rbac = createGatekeeper({ connector });

// 1. NextAuth configuration with Gatekeeper integration
export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  
  // Use Gatekeeper callbacks
  callbacks: {
    ...createGatekeeperCallbacks({
      rbac,
      includePermissionsInSession: true,
      includeRolesInSession: true,
      includeGroupsInSession: true
    }),
    
    // Custom callback to sync users
    async signIn({ user, account, profile }) {
      if (user) {
        await syncUserWithGatekeeper(rbac, user);
      }
      return true;
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
});

/**
 * 2. Using the useGatekeeperPermissions hook in a React component
 */

// components/AdminPanel.tsx
import { useGatekeeperPermissions } from 'gatekeeper-rbac';

export function AdminPanel() {
  const {
    hasPermission,
    hasRole,
    permissions,
    roles
  } = useGatekeeperPermissions();

  if (!hasRole('admin')) {
    return <div>Access denied. Admin role required.</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      
      {hasPermission('users.manage') && (
        <section>
          <h2>User Management</h2>
          <button>Add User</button>
          <button>Edit Users</button>
        </section>
      )}
      
      {hasPermission('system.settings') && (
        <section>
          <h2>System Settings</h2>
          <button>Configure System</button>
        </section>
      )}

      <div>
        <h3>Your Permissions:</h3>
        <ul>
          {permissions.map(permission => (
            <li key={permission}>{permission}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * 3. Using the withPermission HOC to protect components
 */

import { withPermission } from 'gatekeeper-rbac';

const UserManagement = () => (
  <div>
    <h1>User Management</h1>
    <p>Manage users here...</p>
  </div>
);

// Protect the component with permission requirement
export const ProtectedUserManagement = withPermission(
  UserManagement,
  'users.manage',
  {
    fallback: () => <div>You don't have permission to manage users.</div>,
    redirectTo: '/unauthorized'
  }
);

/**
 * 4. Protecting API routes
 */

// pages/api/admin/users.ts
import { withRBAC } from 'gatekeeper-rbac';
import { NextApiRequest, NextApiResponse } from 'next';

const handler = withRBAC(rbac)(
  ['users.read', 'admin.access'], // Required permissions
  async (req: NextApiRequest, res: NextApiResponse, session) => {
    if (req.method === 'GET') {
      // Get users logic
      const users = await getUsersFromDatabase();
      return res.json(users);
    }
    
    if (req.method === 'POST') {
      // Check additional permission for creating users
      const canCreate = await rbac.hasPermission(session.user.id, 'users.create');
      if (!canCreate.allowed) {
        return res.status(403).json({ error: 'Cannot create users' });
      }
      
      // Create user logic
      const newUser = await createUser(req.body);
      return res.json(newUser);
    }
    
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
);

export default handler;

/**
 * 5. Custom middleware for more complex permission checking
 */

// middleware/auth.ts
import { createPermissionMiddleware } from 'gatekeeper-rbac';

export const requirePermission = createPermissionMiddleware(rbac);

// Usage in API routes
// pages/api/protected-route.ts
import { requirePermission } from '../../middleware/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply middleware
  await new Promise((resolve, reject) => {
    requirePermission('admin.access')(req, res, (error?: any) => {
      if (error) reject(error);
      else resolve(undefined);
    });
  });

  // Your protected route logic here
  res.json({ message: 'This is a protected route' });
}

/**
 * 6. Client-side permission checking
 */

// components/ConditionalContent.tsx
import { useSession } from 'next-auth/react';
import { useGatekeeperPermissions } from 'gatekeeper-rbac';

export function ConditionalContent() {
  const { data: session } = useSession();
  const { hasPermission, hasAnyRole, inGroup } = useGatekeeperPermissions();

  if (!session) {
    return <div>Please sign in to view content</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Show content based on permissions */}
      {hasPermission('content.create') && (
        <button>Create New Content</button>
      )}
      
      {/* Show content based on roles */}
      {hasAnyRole(['editor', 'admin']) && (
        <div>Editor/Admin only content</div>
      )}
      
      {/* Show content based on group membership */}
      {inGroup('beta-testers') && (
        <div>Beta feature preview</div>
      )}
      
      {/* Complex permission checking */}
      {hasPermission('reports.view') && hasAnyRole(['manager', 'admin']) && (
        <div>
          <h2>Reports</h2>
          <p>View reports here...</p>
        </div>
      )}
    </div>
  );
}

/**
 * 7. Server-side permission checking in getServerSideProps
 */

// pages/admin-dashboard.tsx
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { checkServerPermission } from 'gatekeeper-rbac';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, {
    /* your auth options */
  });

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  // Check if user has admin access
  const hasAdminAccess = await checkServerPermission(
    rbac,
    session.user.id,
    'admin.access'
  );

  if (!hasAdminAccess) {
    return {
      redirect: {
        destination: '/unauthorized',
        permanent: false,
      },
    };
  }

  // Fetch admin-specific data
  const adminData = await fetchAdminData(session.user.id);

  return {
    props: {
      adminData,
    },
  };
};

export default function AdminDashboard({ adminData }: { adminData: any }) {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <pre>{JSON.stringify(adminData, null, 2)}</pre>
    </div>
  );
}