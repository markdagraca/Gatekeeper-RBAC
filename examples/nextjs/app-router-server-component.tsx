/**
 * App Router Server Component Example
 * 
 * This example shows how to use Gatekeeper RBAC in Next.js App Router
 * Server Components for server-side permission checking.
 */

import { getServerPermissions, createGatekeeper, createFirebaseConnector } from 'gatekeeper-rbac';
import { getFirestore } from 'firebase/firestore';

// Initialize Gatekeeper (in a real app, you'd do this in a shared module)
const db = getFirestore();
const connector = createFirebaseConnector(db);
const rbac = createGatekeeper({ connector });

export default async function AdminDashboard() {
  // Get user permissions on the server
  const permissions = await getServerPermissions(rbac);

  // Handle unauthenticated users
  if (!permissions.isAuthenticated) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  // Check for admin role
  if (!permissions.hasRole('admin')) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Insufficient Permissions</h1>
        <p>You need admin access to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management */}
        {permissions.hasPermission('users.read') && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="space-y-2">
              {permissions.hasPermission('users.create') && (
                <button className="bg-blue-500 text-white px-4 py-2 rounded">
                  Create User
                </button>
              )}
              {permissions.hasPermission('users.update') && (
                <button className="bg-yellow-500 text-white px-4 py-2 rounded">
                  Edit Users
                </button>
              )}
              {permissions.hasPermission('users.delete') && (
                <button className="bg-red-500 text-white px-4 py-2 rounded">
                  Delete Users
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Management */}
        {permissions.hasPermission('content.read') && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Content Management</h2>
            <div className="space-y-2">
              {permissions.hasPermission('content.create') && (
                <button className="bg-green-500 text-white px-4 py-2 rounded">
                  Create Content
                </button>
              )}
              {permissions.hasPermission('content.publish') && (
                <button className="bg-purple-500 text-white px-4 py-2 rounded">
                  Publish Content
                </button>
              )}
            </div>
          </div>
        )}

        {/* Analytics */}
        {permissions.hasPermission('analytics.read') && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Analytics</h2>
            <p className="text-gray-600">View site analytics and reports</p>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-8 bg-gray-100 p-4 rounded">
        <h3 className="font-semibold mb-2">User Info:</h3>
        <p><strong>User ID:</strong> {permissions.userId}</p>
        <p><strong>Roles:</strong> {permissions.roles.join(', ')}</p>
        <p><strong>Permissions:</strong> {permissions.permissions.slice(0, 5).join(', ')}
          {permissions.permissions.length > 5 && '...'}
        </p>
      </div>
    </div>
  );
}