/**
 * Pages Router API Route Example
 * 
 * This example shows how to protect Pages Router API routes using Gatekeeper RBAC.
 * This would be placed in pages/api/admin/roles.ts
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC, createGatekeeper, createFirebaseConnector } from 'gatekeeper-rbac';
import { getFirestore } from 'firebase/firestore';

// Initialize Gatekeeper
const db = getFirestore();
const connector = createFirebaseConnector(db);
const rbac = createGatekeeper({ connector });

// Mock roles data
const mockRoles = [
  { id: 'admin', name: 'Administrator', permissions: ['*'] },
  { id: 'editor', name: 'Content Editor', permissions: ['content.*', 'media.read'] },
  { id: 'viewer', name: 'Viewer', permissions: ['content.read', 'media.read'] },
];

// Protect the entire API route with required permissions
export default withRBAC(rbac)(
  ['roles.read', 'admin.access'], // Required permissions
  async (req: NextApiRequest, res: NextApiResponse, session: any) => {
    try {
      switch (req.method) {
        case 'GET':
          return handleGetRoles(req, res, session);
        case 'POST':
          return handleCreateRole(req, res, session);
        case 'PUT':
          return handleUpdateRole(req, res, session);
        case 'DELETE':
          return handleDeleteRole(req, res, session);
        default:
          res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('API route error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

async function handleGetRoles(req: NextApiRequest, res: NextApiResponse, session: any) {
  // All users with roles.read can view roles
  return res.status(200).json({
    roles: mockRoles,
    requestedBy: session.user.id
  });
}

async function handleCreateRole(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Check for roles.create permission
  const hasCreatePermission = await rbac.hasPermission(session.user.id, 'roles.create');
  
  if (!hasCreatePermission.allowed) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      requiredPermission: 'roles.create' 
    });
  }

  const { name, permissions } = req.body;

  if (!name || !permissions) {
    return res.status(400).json({ error: 'Name and permissions are required' });
  }

  const newRole = {
    id: `role_${Date.now()}`,
    name,
    permissions: Array.isArray(permissions) ? permissions : [permissions]
  };

  mockRoles.push(newRole);

  return res.status(201).json({
    message: 'Role created successfully',
    role: newRole,
    createdBy: session.user.id
  });
}

async function handleUpdateRole(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Check for roles.update permission
  const hasUpdatePermission = await rbac.hasPermission(session.user.id, 'roles.update');
  
  if (!hasUpdatePermission.allowed) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      requiredPermission: 'roles.update' 
    });
  }

  const { roleId, name, permissions } = req.body;

  if (!roleId) {
    return res.status(400).json({ error: 'Role ID is required' });
  }

  const roleIndex = mockRoles.findIndex(role => role.id === roleId);
  
  if (roleIndex === -1) {
    return res.status(404).json({ error: 'Role not found' });
  }

  // Update role
  if (name) mockRoles[roleIndex].name = name;
  if (permissions) mockRoles[roleIndex].permissions = Array.isArray(permissions) ? permissions : [permissions];

  return res.status(200).json({
    message: 'Role updated successfully',
    role: mockRoles[roleIndex],
    updatedBy: session.user.id
  });
}

async function handleDeleteRole(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Check for roles.delete permission
  const hasDeletePermission = await rbac.hasPermission(session.user.id, 'roles.delete');
  
  if (!hasDeletePermission.allowed) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      requiredPermission: 'roles.delete' 
    });
  }

  const { roleId } = req.body;

  if (!roleId) {
    return res.status(400).json({ error: 'Role ID is required' });
  }

  // Prevent deletion of admin role
  if (roleId === 'admin') {
    return res.status(403).json({ error: 'Cannot delete admin role' });
  }

  const roleIndex = mockRoles.findIndex(role => role.id === roleId);
  
  if (roleIndex === -1) {
    return res.status(404).json({ error: 'Role not found' });
  }

  const deletedRole = mockRoles.splice(roleIndex, 1)[0];

  return res.status(200).json({
    message: 'Role deleted successfully',
    deletedRole,
    deletedBy: session.user.id
  });
}