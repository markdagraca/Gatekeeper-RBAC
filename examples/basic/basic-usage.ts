/**
 * Basic Gatekeeper RBAC Usage Example
 * 
 * This example demonstrates:
 * - Setting up RBAC with Firebase connector
 * - Creating users, roles, and groups
 * - Checking permissions
 * - Using templates for common patterns
 */

import { 
  createGatekeeper, 
  createFirebaseConnector,
  createTemplateManager,
  roleTemplates 
} from 'gatekeeper-rbac';

// Initialize Firebase (this would be your Firebase config)
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Your Firebase config
  projectId: "your-project-id",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function basicExample() {
  // 1. Create the Firebase connector
  const connector = createFirebaseConnector(db);
  
  // 2. Initialize Gatekeeper RBAC
  const rbac = createGatekeeper({
    connector,
    wildcardSupport: true,
    cacheEnabled: true,
    cacheTTL: 300 // 5 minutes
  });

  // 3. Create a user
  const user = await connector.createUser({
    id: 'user-123',
    email: 'john@example.com',
    name: 'John Doe'
  });

  console.log('Created user:', user);

  // 4. Create roles using templates
  const templateManager = createTemplateManager(connector);
  
  const adminRole = await templateManager.applyRoleTemplate('admin', 'admin-role');
  const viewerRole = await templateManager.applyRoleTemplate('viewer', 'viewer-role');
  
  console.log('Created roles:', { adminRole, viewerRole });

  // 5. Create a custom role
  const blogEditorRole = await connector.createRole({
    id: 'blog-editor',
    name: 'Blog Editor',
    description: 'Can manage blog content',
    permissions: [
      { permission: 'blog.create' },
      { permission: 'blog.update' },
      { permission: 'blog.read' },
      { permission: 'blog.list' },
      { permission: 'comments.moderate' }
    ]
  });

  // 6. Create a group
  const editorsGroup = await connector.createGroup({
    id: 'editors',
    name: 'Content Editors',
    description: 'Group for all content editors',
    members: ['user-123'], // Add our user to the group
    permissions: [
      { permission: 'media.upload' },
      { permission: 'media.read' }
    ]
  });

  // 7. Assign role to user
  await rbac.assignRole('user-123', 'blog-editor');
  await rbac.addUserToGroup('user-123', 'editors');

  // 8. Check permissions
  const canCreateBlog = await rbac.hasPermission('user-123', 'blog.create');
  const canDeleteBlog = await rbac.hasPermission('user-123', 'blog.delete');
  const canUploadMedia = await rbac.hasPermission('user-123', 'media.upload');

  console.log('Permission checks:', {
    canCreateBlog: canCreateBlog.allowed,
    canDeleteBlog: canDeleteBlog.allowed,
    canUploadMedia: canUploadMedia.allowed
  });

  // 9. Check multiple permissions at once
  const permissions = await rbac.hasPermissions('user-123', [
    'blog.create',
    'blog.update',
    'blog.delete',
    'admin.access'
  ]);

  console.log('Multiple permission check:', permissions);

  // 10. Get user's effective permissions
  const userPermissions = await rbac.getUserEffectivePermissions('user-123');
  console.log('User effective permissions:', userPermissions.map(p => p.permission));

  // 11. Grant direct permission to user
  await rbac.grantPermission('user-123', {
    permission: 'special.feature',
    conditions: [
      {
        attribute: 'timestamp',
        operator: 'greaterThan',
        value: Date.now()
      }
    ]
  });

  // 12. Check conditional permission
  const specialFeatureAccess = await rbac.hasPermission('user-123', 'special.feature', {
    timestamp: Date.now() + 1000 // Future timestamp
  });

  console.log('Conditional permission result:', specialFeatureAccess);
}

// Run the example
basicExample().catch(console.error);