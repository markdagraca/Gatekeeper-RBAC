/**
 * Pages Router getServerSideProps Example
 * 
 * This example shows how to use Gatekeeper RBAC with Next.js Pages Router
 * for server-side permission checking using getServerSideProps.
 */

import { GetServerSideProps } from 'next';
import { getServerSidePermissions, createGatekeeper, createFirebaseConnector } from 'gatekeeper-rbac';
import { getFirestore } from 'firebase/firestore';

// Note: Firebase should be initialized in your app with initializeApp()
// import { initializeApp } from 'firebase/app';
// const app = initializeApp({ /* your config */ });

// Initialize Gatekeeper with Firebase
const db = getFirestore(); // Uses default Firebase app
const connector = createFirebaseConnector(db);
const rbac = createGatekeeper({ connector });

interface Props {
  user: {
    userId: string;
    permissions: string[];
    roles: Array<{ id: string; name: string }>;
  } | null;
}

export default function UserManagementPage({ user }: Props) {
  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  const hasPermission = (permission: string) => 
    user.permissions.includes(permission);

  const hasRole = (roleName: string) => 
    user.roles.some(role => role.name === roleName);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      
      {!hasRole('admin') && !hasRole('user-manager') && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>You need admin or user-manager role to fully access this page.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">User Actions</h2>
          <div className="space-y-3">
            {hasPermission('users.read') ? (
              <button className="bg-blue-500 text-white px-4 py-2 rounded w-full">
                View Users
              </button>
            ) : (
              <button disabled className="bg-gray-300 text-gray-500 px-4 py-2 rounded w-full">
                View Users (No Permission)
              </button>
            )}

            {hasPermission('users.create') ? (
              <button className="bg-green-500 text-white px-4 py-2 rounded w-full">
                Create User
              </button>
            ) : (
              <button disabled className="bg-gray-300 text-gray-500 px-4 py-2 rounded w-full">
                Create User (No Permission)
              </button>
            )}

            {hasPermission('users.update') ? (
              <button className="bg-yellow-500 text-white px-4 py-2 rounded w-full">
                Edit Users
              </button>
            ) : (
              <button disabled className="bg-gray-300 text-gray-500 px-4 py-2 rounded w-full">
                Edit Users (No Permission)
              </button>
            )}

            {hasPermission('users.delete') ? (
              <button className="bg-red-500 text-white px-4 py-2 rounded w-full">
                Delete Users
              </button>
            ) : (
              <button disabled className="bg-gray-300 text-gray-500 px-4 py-2 rounded w-full">
                Delete Users (No Permission)
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Your Info</h2>
          <div className="space-y-2">
            <p><strong>User ID:</strong> {user.userId}</p>
            <p><strong>Roles:</strong></p>
            <ul className="ml-4 list-disc">
              {user.roles.map(role => (
                <li key={role.id}>{role.name}</li>
              ))}
            </ul>
            <p><strong>Permissions:</strong></p>
            <ul className="ml-4 list-disc max-h-32 overflow-y-auto">
              {user.permissions.map(permission => (
                <li key={permission} className="text-sm">{permission}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const result = await getServerSidePermissions(context, rbac);

  if (result.redirect) {
    return { redirect: result.redirect };
  }

  if (!result.isAuthenticated) {
    return {
      props: { user: null }
    };
  }

  return {
    props: {
      user: {
        userId: result.userId,
        permissions: result.permissions,
        roles: result.roles
      }
    }
  };
};