# Next.js Integration Examples

This directory contains comprehensive examples showing how to use Gatekeeper RBAC with all Next.js rendering patterns and authentication flows.

## 🏗️ Architecture Overview

Gatekeeper RBAC supports all Next.js patterns:

- **🛡️ Middleware**: Edge-level route protection
- **⚡ App Router**: Server Components and API Routes  
- **📄 Pages Router**: getServerSideProps and API Routes
- **🎯 Client Components**: React hooks and HOCs

## 📁 Files Overview

### Core Integration Files

| File | Description | Use Case |
|------|-------------|----------|
| `middleware.ts` | Edge middleware for route protection | Global authentication |
| `app-router-server-component.tsx` | Server Component example | Server-side rendering with permissions |
| `app-router-api-route.ts` | App Router API protection | Modern API routes |
| `pages-router-getServerSideProps.tsx` | SSR with permissions | Traditional SSR |
| `pages-router-api-route.ts` | Pages Router API protection | Traditional API routes |
| `client-component-with-auth.tsx` | Client-side permissions | Interactive components |

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install gatekeeper-rbac next-auth firebase
```

### 2. Set up Firebase

```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### 3. Configure NextAuth

```typescript
// pages/api/auth/[...nextauth].ts or app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { FirestoreAdapter } from '@next-auth/firebase-adapter';
import GoogleProvider from 'next-auth/providers/google';
import { createGatekeeperCallbacks, createGatekeeper, createFirebaseConnector } from 'gatekeeper-rbac';
import { db } from '../../../lib/firebase';

const connector = createFirebaseConnector(db);
const rbac = createGatekeeper({ connector });

export default NextAuth({
  adapter: FirestoreAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    ...createGatekeeperCallbacks({
      rbac,
      includePermissionsInSession: true,
      includeRolesInSession: true,
    })
  },
});
```

### 4. Set up Middleware (Optional)

```typescript
// middleware.ts (at project root)
import { createNextjsMiddleware, createGatekeeper, createFirebaseConnector } from 'gatekeeper-rbac';
import { db } from './lib/firebase';

const connector = createFirebaseConnector(db);
const rbac = createGatekeeper({ connector });

export const middleware = createNextjsMiddleware(rbac);

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)',],
};
```

## 📝 Usage Patterns

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

### API Routes (App Router)

```typescript
import { withPermissions } from 'gatekeeper-rbac';

export const GET = withPermissions(rbac, 'users.read')(
  async (request, { session }) => {
    // Protected route logic
    return Response.json({ users: [] });
  }
);
```

### Client Components

```typescript
'use client';
import { useGatekeeperPermissions } from 'gatekeeper-rbac';

export default function Dashboard() {
  const { hasPermission, hasRole } = useGatekeeperPermissions();
  
  return (
    <div>
      {hasPermission('users.create') && (
        <button>Create User</button>
      )}
    </div>
  );
}
```

### SSR (Pages Router)

```typescript
export const getServerSideProps = async (context) => {
  const result = await getServerSidePermissions(context, rbac);
  
  if (!result.isAuthenticated) {
    return { redirect: { destination: '/login' } };
  }
  
  return { props: { user: result } };
};
```

## 🔒 Permission Patterns

### Hierarchical Permissions

```typescript
// Grant all admin permissions
await rbac.grantPermission(userId, { permission: 'admin.*' });

// Grant specific content permissions
await rbac.grantPermission(userId, { permission: 'content.create' });
await rbac.grantPermission(userId, { permission: 'content.read' });
```

### Conditional Permissions

```typescript
// Only allow editing own content
await rbac.grantPermission(userId, {
  permission: 'content.update',
  conditions: [
    {
      attribute: 'content.ownerId',
      operator: 'equals',
      value: '${userId}'
    }
  ]
});
```

### Role-Based Access

```typescript
// Create roles
await connector.createRole({
  id: 'editor',
  name: 'Content Editor',
  permissions: [
    { permission: 'content.*' },
    { permission: 'media.read' }
  ]
});

// Assign to user
await rbac.assignRole(userId, 'editor');
```

## 🎯 Common Patterns

### Protecting Entire Page Trees

```typescript
// middleware.ts
export const config = {
  matcher: [
    '/admin/:path*',  // Protect all admin routes
    '/dashboard/:path*', // Protect all dashboard routes
  ],
};
```

### API Route Groups

```typescript
// Protect entire API namespace
export const config = {
  matcher: ['/api/admin/:path*'],
};
```

### Mixed Authentication

```typescript
// Some routes require authentication, others are public
export const config = {
  matcher: [
    '/((?!api/auth|api/public|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## 🔧 Environment Variables

Create a `.env.local` file:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase config
```

## 🚀 Deployment Considerations

### Vercel Deployment

1. **Edge Runtime**: Middleware runs on edge runtime by default
2. **Firebase Config**: Use environment variables for Firebase config
3. **NextAuth Secret**: Generate a secure `NEXTAUTH_SECRET`

### Performance Tips

1. **Cache Permissions**: Use session storage for permissions
2. **Batch Checks**: Check multiple permissions at once
3. **Server-Side**: Prefer server-side checks for security

## 🐛 Debugging

### Enable Debug Mode

```typescript
const rbac = createGatekeeper({
  connector,
  debug: true, // Enables verbose logging
});
```

### Common Issues

1. **Middleware not running**: Check your `matcher` config
2. **Permissions not updating**: Clear NextAuth session cache
3. **Firebase errors**: Verify Firestore rules and connection

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Gatekeeper RBAC API Reference](../../README.md)

## 🤝 Contributing

Found an issue or want to improve these examples? Please open an issue or submit a pull request!