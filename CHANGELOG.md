# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2024-12-19

### Fixed
- **Firebase Dependency Conflict**: Updated peer dependencies to support both Firebase v10 and v11 (`^10.0.0 || ^11.0.0`) to resolve ERESOLVE errors when using the latest Firebase version
- **Firebase Admin SDK Compatibility**: Extended firebase-admin peer dependency to support v12 (`^11.0.0 || ^12.0.0`) for better forward compatibility

## [1.2.1] - 2024-12-19

### Added
- **Comprehensive Next.js Support**: Extended beyond basic NextAuth integration to provide utilities for all Next.js rendering patterns including middleware, App Router, Pages Router, and client components
- **Next.js-Specific Utilities**: Added utilities for edge middleware, server components, API routes, and client-side protection
- **React Fallback Mechanisms**: Implemented fallback mechanisms to support environments where React may not be available
- **Comprehensive Examples**: Provided examples demonstrating integration patterns across different Next.js architectures

### Improved
- **Next.js Integration**: Enhanced support for all Next.js rendering patterns and authentication flows
- **Architecture Coverage**: Extended library to work seamlessly across middleware, App Router, Pages Router, and client components
- **Error Handling**: Improved robustness with React fallback mechanisms for environments with missing dependencies

## [1.0.0] - 2025-01-26

### Added
- Initial release of Gatekeeper RBAC
- Core RBAC functionality with granular permissions
- Google IAM-style permission system with wildcard support
- Hierarchical role and group management with nested structures
- Conditional permissions with context-aware evaluation
- Database-agnostic architecture with connector pattern
- Firebase connector with comprehensive Firestore integration
- NextAuth.js integration with React hooks, HOCs, and middleware
- Pre-built templates for common RBAC patterns
- High-performance caching system with TTL support
- Comprehensive TypeScript support with full type safety
- 100% test coverage with 310+ tests
- Complete documentation and examples

### Features
- **Permission System**: Hierarchical permissions (`service.resource.action`) with wildcard support (`*`, `resource.*`)
- **Conditional Permissions**: Fine-grained access control with custom conditions and context evaluation
- **Groups & Roles**: Nested group membership with permission inheritance
- **Database Connectors**: Firebase/Firestore connector with extensible interface for other databases
- **NextAuth Integration**: Seamless authentication integration with session callbacks, hooks, and middleware
- **Templates**: Pre-built role and permission templates for rapid setup
- **Performance**: Built-in caching, batch operations, and optimized permission resolution
- **Security**: Principle of least privilege, input validation, and secure permission evaluation

### Developer Experience
- Full TypeScript support with comprehensive type definitions
- React hooks for client-side permission checking
- Higher-Order Components for component-level access control
- API route protection middleware
- Extensive documentation and examples
- 100% statement coverage testing
- ESLint and TypeScript strict mode compliance

### Supported Integrations
- NextAuth.js v4.24.5+
- Firebase v10.0.0+
- Firebase Admin v11.0.0+
- React applications
- Next.js applications
- Node.js server environments