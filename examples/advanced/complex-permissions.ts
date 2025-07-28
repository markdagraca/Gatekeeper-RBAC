/**
 * Advanced Gatekeeper RBAC Example - Complex Permissions
 * 
 * This example demonstrates:
 * - Hierarchical organizations with nested groups
 * - Conditional permissions based on context
 * - Resource-specific ownership permissions
 * - Time-based access controls
 * - Custom permission templates
 * - Performance optimization with caching
 */

import {
  createGatekeeper,
  createFirebaseConnector,
  createTemplateManager,
  createPermissionTemplate,
  utils
} from 'gatekeeper-rbac';

async function advancedExample() {
  const connector = createFirebaseConnector(/* firestore */);
  const rbac = createGatekeeper({
    connector,
    wildcardSupport: true,
    strictMode: false
  });

  const templateManager = createTemplateManager(connector);

  // 1. Create complex organizational structure
  await setupOrganizationalStructure(rbac, templateManager);

  // 2. Create context-aware permissions
  await setupContextAwarePermissions(rbac);

  // 3. Create time-based permissions
  await setupTimeBasedPermissions(rbac);

  // 4. Create resource ownership permissions
  await setupResourceOwnershipPermissions(rbac);

  // 5. Performance testing and optimization
  await performanceOptimization(rbac);
}

async function setupOrganizationalStructure(rbac: any, templateManager: any) {
  console.log('Setting up organizational structure...');

  // Create departments as top-level groups
  const itDepartment = await templateManager.applyGroupTemplate(
    'department',
    'it-dept',
    'IT',
    [
      { permission: 'servers.*' },
      { permission: 'databases.*' },
      { permission: 'system.admin' }
    ]
  );

  const marketingDepartment = await templateManager.applyGroupTemplate(
    'department',
    'marketing-dept',
    'Marketing',
    [
      { permission: 'campaigns.*' },
      { permission: 'analytics.read' },
      { permission: 'content.marketing' }
    ]
  );

  // Create sub-teams within departments
  const backendTeam = await rbac.connector.createGroup({
    id: 'backend-team',
    name: 'Backend Development Team',
    description: 'Backend developers within IT',
    members: [itDepartment], // Nested group
    permissions: [
      { permission: 'api.*' },
      { permission: 'database.read' },
      { permission: 'database.write' }
    ]
  });

  const frontendTeam = await rbac.connector.createGroup({
    id: 'frontend-team',
    name: 'Frontend Development Team',
    description: 'Frontend developers within IT',
    members: [itDepartment], // Nested group
    permissions: [
      { permission: 'ui.*' },
      { permission: 'assets.*' },
      { permission: 'cdn.read' }
    ]
  });

  // Create project-specific groups
  const projectAlpha = await templateManager.applyGroupTemplate(
    'project',
    'project-alpha',
    'Alpha',
    [
      { 
        permission: 'projects.alpha.*',
        conditions: [
          {
            attribute: 'project_status',
            operator: 'equals',
            value: 'active'
          }
        ]
      }
    ]
  );

  console.log('Organizational structure created');
}

async function setupContextAwarePermissions(rbac: any) {
  console.log('Setting up context-aware permissions...');

  // Create users with different contexts
  const regularUser = await rbac.connector.createUser({
    id: 'user-regular',
    email: 'user@example.com',
    name: 'Regular User',
    metadata: {
      department: 'marketing',
      level: 'junior',
      country: 'US'
    }
  });

  const managerUser = await rbac.connector.createUser({
    id: 'user-manager',
    email: 'manager@example.com',
    name: 'Manager User',
    metadata: {
      department: 'marketing',
      level: 'manager',
      country: 'US'
    }
  });

  // Create context-aware role
  const contextualRole = await rbac.connector.createRole({
    id: 'contextual-role',
    name: 'Contextual Access Role',
    description: 'Role with context-dependent permissions',
    permissions: [
      // Can read reports only if from same department
      {
        permission: 'reports.read',
        conditions: [
          {
            attribute: 'attributes.userDepartment',
            operator: 'equals', 
            value: '${metadata.department}'
          }
        ]
      },
      // Can approve only if manager level or above
      {
        permission: 'approvals.create',
        conditions: [
          {
            attribute: 'attributes.userLevel',
            operator: 'in',
            value: ['manager', 'director', 'vp']
          }
        ]
      },
      // Geographic restrictions
      {
        permission: 'data.sensitive',
        conditions: [
          {
            attribute: 'attributes.userCountry',
            operator: 'in',
            value: ['US', 'CA'] // Only US and Canada
          }
        ]
      }
    ]
  });

  await rbac.assignRole('user-regular', 'contextual-role');
  await rbac.assignRole('user-manager', 'contextual-role');

  // Test contextual permissions
  const regularContext = {
    attributes: {
      userDepartment: 'marketing',
      userLevel: 'junior',
      userCountry: 'US'
    }
  };

  const managerContext = {
    attributes: {
      userDepartment: 'marketing',
      userLevel: 'manager',
      userCountry: 'US'
    }
  };

  const regularCanRead = await rbac.hasPermission('user-regular', 'reports.read', regularContext);
  const regularCanApprove = await rbac.hasPermission('user-regular', 'approvals.create', regularContext);
  const managerCanApprove = await rbac.hasPermission('user-manager', 'approvals.create', managerContext);

  console.log('Context-aware permissions:', {
    regularCanRead: regularCanRead.allowed,
    regularCanApprove: regularCanApprove.allowed,
    managerCanApprove: managerCanApprove.allowed
  });
}

async function setupTimeBasedPermissions(rbac: any) {
  console.log('Setting up time-based permissions...');

  // Create time-based role for temporary access
  const temporaryRole = await rbac.connector.createRole({
    id: 'temporary-access',
    name: 'Temporary Access Role',
    description: 'Time-limited access to sensitive operations',
    permissions: [
      {
        permission: 'maintenance.execute',
        conditions: [
          {
            attribute: 'timestamp',
            operator: 'greaterThan',
            value: Date.now() // Current time
          },
          {
            attribute: 'timestamp',
            operator: 'lessThan',
            value: Date.now() + (2 * 60 * 60 * 1000) // 2 hours from now
          }
        ]
      },
      // Business hours only permission
      {
        permission: 'banking.transfer',
        conditions: [
          {
            attribute: 'attributes.hour',
            operator: 'greaterThan',
            value: 8 // After 8 AM
          },
          {
            attribute: 'attributes.hour',
            operator: 'lessThan',
            value: 18 // Before 6 PM
          }
        ]
      }
    ]
  });

  const tempUser = await rbac.connector.createUser({
    id: 'temp-user',
    email: 'temp@example.com',
    name: 'Temporary User'
  });

  await rbac.assignRole('temp-user', 'temporary-access');

  // Test time-based permissions
  const currentHour = new Date().getHours();
  const timeContext = {
    timestamp: Date.now() + (30 * 60 * 1000), // 30 minutes from now
    attributes: {
      hour: currentHour
    }
  };

  const canExecuteMaintenance = await rbac.hasPermission('temp-user', 'maintenance.execute', timeContext);
  const canTransfer = await rbac.hasPermission('temp-user', 'banking.transfer', timeContext);

  console.log('Time-based permissions:', {
    canExecuteMaintenance: canExecuteMaintenance.allowed,
    canTransfer: canTransfer.allowed,
    currentHour
  });
}

async function setupResourceOwnershipPermissions(rbac: any) {
  console.log('Setting up resource ownership permissions...');

  // Create ownership-based permissions template
  const ownershipTemplate = createPermissionTemplate('ownership-template', 'Resource Ownership Template')
    .description('Template for resource ownership permissions')
    .addPermission('${resource}.read.own', [
      {
        attribute: 'resource.ownerId',
        operator: 'equals',
        value: '${userId}'
      }
    ])
    .addPermission('${resource}.update.own', [
      {
        attribute: 'resource.ownerId',
        operator: 'equals',
        value: '${userId}'
      }
    ])
    .addPermission('${resource}.delete.own', [
      {
        attribute: 'resource.ownerId',
        operator: 'equals',
        value: '${userId}'
      }
    ])
    .addVariable('resource', 'documents')
    .build();

  await rbac.connector.createTemplate(ownershipTemplate);

  // Apply template to create ownership role
  const template = await rbac.connector.getTemplate('ownership-template');
  const ownershipPermissions = templateManager.applyTemplateVariables(template!, {
    resource: 'documents',
    userId: '${userId}' // This will be replaced at runtime
  });

  const documentOwnerRole = await rbac.connector.createRole({
    id: 'document-owner',
    name: 'Document Owner',
    description: 'Can manage own documents',
    permissions: ownershipPermissions
  });

  const docUser = await rbac.connector.createUser({
    id: 'doc-user-123',
    email: 'docuser@example.com',
    name: 'Document User'
  });

  await rbac.assignRole('doc-user-123', 'document-owner');

  // Test ownership permissions
  const ownDocumentContext = {
    resource: { ownerId: 'doc-user-123' },
    userId: 'doc-user-123'
  };

  const otherDocumentContext = {
    resource: { ownerId: 'other-user' },
    userId: 'doc-user-123'
  };

  const canReadOwnDoc = await rbac.hasPermission('doc-user-123', 'documents.read.own', ownDocumentContext);
  const canReadOtherDoc = await rbac.hasPermission('doc-user-123', 'documents.read.own', otherDocumentContext);

  console.log('Ownership permissions:', {
    canReadOwnDoc: canReadOwnDoc.allowed,
    canReadOtherDoc: canReadOtherDoc.allowed
  });
}

async function performanceOptimization(rbac: any) {
  console.log('Running performance optimization tests...');

  const startTime = Date.now();

  // Create test user with multiple roles and groups
  const testUser = await rbac.connector.createUser({
    id: 'perf-test-user',
    email: 'perftest@example.com',
    name: 'Performance Test User'
  });

  // Add to multiple groups and roles
  await rbac.assignRole('perf-test-user', 'contextual-role');
  await rbac.assignRole('perf-test-user', 'document-owner');
  await rbac.addUserToGroup('perf-test-user', 'backend-team');
  await rbac.addUserToGroup('perf-test-user', 'project-alpha');

  // Test permission checking performance
  const permissions = [
    'api.read',
    'database.write',
    'projects.alpha.read',
    'documents.read.own',
    'reports.read'
  ];

  // Performance test - sequential checks
  const sequentialStart = Date.now();
  for (const permission of permissions) {
    await rbac.hasPermission('perf-test-user', permission);
  }
  const sequentialTime = Date.now() - sequentialStart;

  // Batch permission check
  const batchStart = Date.now();
  await rbac.hasPermissions('perf-test-user', permissions);
  const batchTime = Date.now() - batchStart;

  console.log('Performance metrics:', {
    sequentialCheckTime: sequentialTime + 'ms',
    batchCheckTime: batchTime + 'ms',
    totalSetupTime: (Date.now() - startTime) + 'ms'
  });

  // Analyze permission patterns
  const userPermissions = await rbac.getUserEffectivePermissions('perf-test-user');
  const analysis = utils.debug.analyzePermissionPatterns(
    userPermissions.map(p => p.permission)
  );

  console.log('Permission analysis:', analysis);
}

// Export the example function
export { advancedExample };