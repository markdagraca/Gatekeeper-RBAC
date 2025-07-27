/**
 * Client Component with Authentication Example
 * 
 * This example shows how to use Gatekeeper RBAC in client-side components
 * with the useGatekeeperPermissions hook and requireAuth HOC.
 */

'use client';

import React from 'react';
import { useGatekeeperPermissions, requireAuth, createGatekeeper, createFirebaseConnector } from 'gatekeeper-rbac';
import { getFirestore } from 'firebase/firestore';

// Initialize Gatekeeper (typically done in a shared context or provider)
const db = getFirestore();
const connector = createFirebaseConnector(db);
const rbac = createGatekeeper({ connector });

// Basic client component using the hook
function UserDashboard() {
  const {
    hasPermission,
    hasRole,
    permissions,
    roles,
    isLoading,
    user
  } = useGatekeeperPermissions();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">User Dashboard</h1>
      
      {/* User Info Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Name:</strong> {user?.name || 'N/A'}</p>
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Roles:</strong> {roles.join(', ') || 'None'}</p>
            <p><strong>Permissions:</strong> {permissions.length} total</p>
          </div>
        </div>
      </div>

      {/* Action Cards Based on Permissions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Profile Management */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Profile</h3>
          <div className="space-y-2">
            <button className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              View Profile
            </button>
            {hasPermission('profile.update') && (
              <button className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Content Management */}
        {hasPermission('content.read') && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Content</h3>
            <div className="space-y-2">
              <button className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                View Content
              </button>
              {hasPermission('content.create') && (
                <button className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  Create Content
                </button>
              )}
              {hasPermission('content.publish') && (
                <button className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
                  Publish Content
                </button>
              )}
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {hasRole('admin') && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Administration</h3>
            <div className="space-y-2">
              {hasPermission('users.read') && (
                <button className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                  Manage Users
                </button>
              )}
              {hasPermission('roles.read') && (
                <button className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                  Manage Roles
                </button>
              )}
              {hasPermission('system.settings') && (
                <button className="w-full bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">
                  System Settings
                </button>
              )}
            </div>
          </div>
        )}

        {/* Analytics */}
        {hasPermission('analytics.read') && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Analytics</h3>
            <div className="space-y-2">
              <button className="w-full bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600">
                View Reports
              </button>
              {hasPermission('analytics.export') && (
                <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                  Export Data
                </button>
              )}
            </div>
          </div>
        )}

        {/* Billing (for specific roles) */}
        {(hasRole('admin') || hasRole('billing-manager')) && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Billing</h3>
            <div className="space-y-2">
              {hasPermission('billing.read') && (
                <button className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
                  View Invoices
                </button>
              )}
              {hasPermission('billing.manage') && (
                <button className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
                  Manage Billing
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Debug Information */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <details>
          <summary className="cursor-pointer font-semibold">Debug Info</summary>
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <strong>All Roles:</strong>
              <pre className="bg-white p-2 rounded mt-1">{JSON.stringify(roles, null, 2)}</pre>
            </div>
            <div>
              <strong>All Permissions:</strong>
              <pre className="bg-white p-2 rounded mt-1 max-h-32 overflow-y-auto">
                {JSON.stringify(permissions, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

// Export the component wrapped with authentication requirements
export default requireAuth(rbac, {
  // Require users to have at least one of these roles
  roles: ['user', 'admin', 'editor'],
  // Or require specific permissions
  // permissions: ['dashboard.access']
})(UserDashboard);

// Alternative: Export individual components for different use cases

// Admin-only component
export const AdminOnlyComponent = requireAuth(rbac, {
  roles: ['admin']
})(function AdminPanel() {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded">
      <h2 className="text-xl font-bold text-red-800">Admin Only Area</h2>
      <p className="text-red-700">This component is only visible to admins.</p>
    </div>
  );
});

// Permission-specific component
export const ContentEditorComponent = requireAuth(rbac, {
  permissions: ['content.create', 'content.update']
})(function ContentEditor() {
  return (
    <div className="p-6 bg-green-50 border border-green-200 rounded">
      <h2 className="text-xl font-bold text-green-800">Content Editor</h2>
      <p className="text-green-700">You can create and edit content.</p>
    </div>
  );
});