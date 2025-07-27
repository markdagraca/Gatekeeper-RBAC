/**
 * App Router API Route Example
 * 
 * This example shows how to protect App Router API routes using Gatekeeper RBAC.
 * This would be placed in app/api/admin/users/route.ts
 */

import { withPermissions, createGatekeeper, createFirebaseConnector } from 'gatekeeper-rbac';
import { getFirestore } from 'firebase/firestore';
import { NextRequest } from 'next/server';

// Initialize Gatekeeper
const db = getFirestore();
const connector = createFirebaseConnector(db);
const rbac = createGatekeeper({ connector });

// Mock user data (in a real app, this would come from your database)
const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'editor' },
];

// GET /api/admin/users - List all users
export const GET = withPermissions(rbac, ['users.read', 'admin.access'])(
  async (request: NextRequest, { session }: any) => {
    try {
      // This handler only runs if user has both 'users.read' AND 'admin.access' permissions
      
      // You can access the authenticated session
      console.log('Request from user:', session.user.id);
      
      // Return the users
      return Response.json({
        users: mockUsers,
        requestedBy: session.user.id
      });
    } catch (error) {
      return Response.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }
  }
);

// POST /api/admin/users - Create a new user
export const POST = withPermissions(rbac, 'users.create')(
  async (request: NextRequest, { session }: any) => {
    try {
      const body = await request.json();
      const { name, email, role } = body;

      // Validate input
      if (!name || !email) {
        return Response.json(
          { error: 'Name and email are required' },
          { status: 400 }
        );
      }

      // Create new user (mock implementation)
      const newUser = {
        id: String(mockUsers.length + 1),
        name,
        email,
        role: role || 'user'
      };

      mockUsers.push(newUser);

      return Response.json({
        message: 'User created successfully',
        user: newUser,
        createdBy: session.user.id
      }, { status: 201 });

    } catch (error) {
      return Response.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/admin/users - Delete a user (requires admin role check)
export const DELETE = withPermissions(rbac, ['users.delete', 'admin.access'])(
  async (request: NextRequest, { session }: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('id');

      if (!userId) {
        return Response.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      // Additional check: users can't delete themselves
      if (userId === session.user.id) {
        return Response.json(
          { error: 'Cannot delete your own account' },
          { status: 403 }
        );
      }

      // Find and remove user (mock implementation)
      const userIndex = mockUsers.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        return Response.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const deletedUser = mockUsers.splice(userIndex, 1)[0];

      return Response.json({
        message: 'User deleted successfully',
        deletedUser,
        deletedBy: session.user.id
      });

    } catch (error) {
      return Response.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }
  }
);