# Gatekeeper RBAC

A flexible, granular role-based access control library for TypeScript with NextAuth.js integration.

## Features

- 🔐 **Google IAM-style granular permissions** with wildcard support
- 🏗️ **Hierarchical role and group management** with nested structures
- 🎯 **Conditional permissions** with context-aware evaluation
- 🔌 **Database-agnostic** with connector pattern (Firebase included)
- ⚡ **NextAuth.js integration** for seamless authentication
- 📦 **Pre-built templates** for common RBAC patterns
- 🛡️ **TypeScript first** with comprehensive type safety
- ⚡ **High performance** with built-in caching
- 🧪 **Well tested** and production-ready

## Installation

```bash
npm install gatekeeper-rbac
```

For Firebase support:
```bash
npm install gatekeeper-rbac firebase firebase-admin
```

For NextAuth integration:
```bash
npm install gatekeeper-rbac next-auth
```

## Quick Start

```typescript
import { createGatekeeper, createFirebaseConnector } from 'gatekeeper-rbac';
import { getFirestore } from 'firebase/firestore';

// Initialize Firebase connector
const db = getFirestore();
const connector = createFirebaseConnector(db);

// Create RBAC instance
const rbac = createGatekeeper({
  connector,
  wildcardSupport: true,
  cacheEnabled: true
});

// Create a user
await connector.createUser({
  id: 'user-123',
  email: 'user@example.com',
  name: 'John Doe'
});

// Create a role
await connector.createRole({
  id: 'editor',
  name: 'Content Editor',
  permissions: [
    { permission: 'content.create' },
    { permission: 'content.update' },
    { permission: 'content.read' }
  ]
});

// Assign role to user
await rbac.assignRole('user-123', 'editor');

// Check permissions
const canEdit = await rbac.hasPermission('user-123', 'content.update');
console.log(canEdit.allowed); // true
```

## Permission System

Gatekeeper uses a hierarchical permission system inspired by Google IAM:

### Permission Format

Permissions follow the format: `service.resource.action` or `resource.action`

```typescript
// Examples
'users.read'           // Read users
'users.create'         // Create users  
'blog.posts.update'    // Update blog posts
'admin.*'              // All admin permissions
'*'                    // All permissions
```

### Wildcard Support

```typescript
// Grant all permissions on users resource
{ permission: 'users.*' }

// Grant read access to all resources
{ permission: '*.read' }

// Grant all permissions (super admin)
{ permission: '*' }
```

### Conditional Permissions

Add conditions to permissions for fine-grained control:

```typescript
{
  permission: 'documents.read',
  conditions: [
    {
      attribute: 'document.ownerId',
      operator: 'equals',
      value: '${userId}' // Only own documents
    }
  ]
}

// Time-based permissions
{
  permission: 'banking.transfer',
  conditions: [
    {
      attribute: 'attributes.hour',
      operator: 'greaterThan',
      value: 8 // Only during business hours
    }
  ]
}
```

## NextAuth.js Integration

Gatekeeper provides comprehensive Next.js support for all rendering patterns:

- **🛡️ Edge Middleware** - Route protection at the edge
- **⚡ App Router** - Server Components and API Routes  
- **📄 Pages Router** - getServerSideProps and API Routes
- **🎯 Client Components** - React hooks and HOCs

### Setup

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth';
import { createGatekeeperCallbacks } from 'gatekeeper-rbac';

export default NextAuth({
  // ... your providers
  callbacks: {
    ...createGatekeeperCallbacks({
      rbac,
      includePermissionsInSession: true,
      includeRolesInSession: true,
      includeGroupsInSession: true
    })
  }
});
```

### Edge Middleware Protection

```typescript
// middleware.ts
import { createNextjsMiddleware } from 'gatekeeper-rbac';

export const middleware = createNextjsMiddleware(rbac);

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)',],
};
```

### React Hooks

```typescript
import { useGatekeeperPermissions } from 'gatekeeper-rbac';

function MyComponent() {
  const { 
    hasPermission, 
    hasRole, 
    permissions, 
    roles 
  } = useGatekeeperPermissions();

  if (!hasRole('admin')) {
    return <div>Access denied</div>;
  }

  return (
    <div>
      {hasPermission('users.create') && (
        <button>Create User</button>
      )}
    </div>
  );
}
```

### Higher-Order Components

```typescript
import { withPermission } from 'gatekeeper-rbac';

const AdminPanel = () => <div>Admin Panel</div>;

export default withPermission(AdminPanel, 'admin.access', {
  fallback: () => <div>Access Denied</div>
});
```

### Server Components (App Router)

```typescript
import { getServerPermissions } from 'gatekeeper-rbac';

export default async function AdminPage() {
  const permissions = await getServerPermissions(rbac);
  
  if (!permissions.hasRole('admin')) {
    return <div>Access denied</div>;
  }
  
  return <div>Admin content</div>;
}
```

### API Route Protection

#### App Router
```typescript
import { withPermissions } from 'gatekeeper-rbac';

export const GET = withPermissions(rbac, 'users.read')(
  async (request, { session }) => {
    const users = await getUsers();
    return Response.json(users);
  }
);
```

#### Pages Router
```typescript
import { withRBAC } from 'gatekeeper-rbac';

export default withRBAC(rbac)(
  ['users.read'], // Required permissions
  async (req, res, session) => {
    const users = await getUsers();
    res.json(users);
  }
);
```

### Server-Side Rendering

```typescript
// getServerSideProps
import { getServerSidePermissions } from 'gatekeeper-rbac';

export const getServerSideProps = async (context) => {
  const result = await getServerSidePermissions(context, rbac);
  
  if (!result.isAuthenticated) {
    return { redirect: { destination: '/login' } };
  }
  
  return { props: { user: result } };
};
```

## Templates

Use pre-built templates for common scenarios:

```typescript
import { createTemplateManager, roleTemplates } from 'gatekeeper-rbac';

const templateManager = createTemplateManager(connector);

// Apply common role templates
await templateManager.applyRoleTemplate('admin', 'admin-role');
await templateManager.applyRoleTemplate('viewer', 'viewer-role');
await templateManager.applyRoleTemplate('contentEditor', 'editor-role');

// Setup basic structure
const { roles, groups } = await templateManager.setupBasicStructure();
```

## Groups and Hierarchy

Create hierarchical organizations:

```typescript
// Create department group
const engineering = await connector.createGroup({
  id: 'engineering',
  name: 'Engineering Department',
  members: [],
  permissions: [
    { permission: 'code.*' },
    { permission: 'deployments.read' }
  ]
});

// Create sub-team with nested group
const backend = await connector.createGroup({
  id: 'backend',
  name: 'Backend Team',
  members: [engineering], // Inherits engineering permissions
  permissions: [
    { permission: 'databases.*' },
    { permission: 'apis.*' }
  ]
});

// Add user to sub-team (gets both groups' permissions)
await rbac.addUserToGroup('user-123', 'backend');
```

## Database Connectors

### Firebase Connector

```typescript
import { createFirebaseConnector } from 'gatekeeper-rbac';
import { getFirestore } from 'firebase/firestore';

const connector = createFirebaseConnector(getFirestore(), {
  collections: {
    users: 'rbac_users',
    roles: 'rbac_roles',
    groups: 'rbac_groups',
    assignments: 'rbac_assignments',
    templates: 'rbac_templates'
  }
});
```

### Custom Connector

Implement the `DatabaseConnector` interface for other databases:

```typescript
import { DatabaseConnector } from 'gatekeeper-rbac';

class MySQLConnector implements DatabaseConnector {
  async getUser(userId: string) {
    // Your implementation
  }
  
  async createUser(user) {
    // Your implementation
  }
  
  // ... implement all methods
}
```

## Configuration

```typescript
const rbac = createGatekeeper({
  connector,
  permissionSeparator: '.', // Default: '.'
  wildcardSupport: true,    // Default: true
  cacheEnabled: true,       // Default: true
  cacheTTL: 300,           // Default: 300 seconds
  strictMode: false        // Default: false
});
```

## API Reference

### Core Classes

- `RBAC` - Main RBAC orchestrator
- `PermissionEngine` - Permission evaluation engine
- `FirebaseConnector` - Firebase database connector
- `TemplateManager` - Template management

### Types

```typescript
interface Permission extends String {}

interface ConditionalPermission {
  permission: Permission;
  conditions?: PermissionCondition[];
  effect?: 'allow' | 'deny';
}

interface User {
  id: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: ConditionalPermission[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  members: (string | Group)[];
  permissions: ConditionalPermission[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

## Examples

Check out the `examples/` directory for comprehensive examples:

- **Basic Usage**: Simple RBAC setup and permission checking
- **NextAuth Integration**: Complete NextAuth.js integration
- **Advanced Patterns**: Complex permissions, hierarchies, and performance optimization
- **Firebase Setup**: Firebase-specific configuration and usage

## Performance

Gatekeeper is designed for high performance:

- **Built-in caching** reduces database queries
- **Batch operations** for checking multiple permissions
- **Optimized permission resolution** with early termination
- **Efficient wildcard matching** with compiled patterns

## Security Considerations

- **Principle of least privilege**: Grant minimal necessary permissions
- **Regular audits**: Review permissions and assignments regularly  
- **Secure storage**: Ensure your database connector uses secure connections
- **Input validation**: Validate all permission strings and user inputs
- **Cache invalidation**: Clear caches when permissions change

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/your-org/gatekeeper-rbac/docs)
- 🐛 [Issues](https://github.com/your-org/gatekeeper-rbac/issues)
- 💬 [Discussions](https://github.com/your-org/gatekeeper-rbac/discussions)

---

Built with ❤️ for the TypeScript community