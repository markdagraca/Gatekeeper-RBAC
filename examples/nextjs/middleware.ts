/**
 * Next.js Middleware Example using Gatekeeper RBAC
 * 
 * This middleware runs at the edge and protects routes before they render.
 * Place this file at the root of your Next.js project as middleware.ts
 */

import { createNextjsMiddleware, createGatekeeper, createFirebaseConnector } from 'gatekeeper-rbac';
import { getFirestore } from 'firebase/firestore';

// Initialize Firebase and Gatekeeper
const db = getFirestore();
const connector = createFirebaseConnector(db);
const rbac = createGatekeeper({ connector });

// Create the middleware
export const middleware = createNextjsMiddleware(rbac);

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};