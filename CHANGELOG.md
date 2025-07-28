# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-12-19

### Changed
- **🔥 BREAKING: Caching Disabled by Default**: Permission caching is now disabled by default (`cacheEnabled: false`) to ensure immediate reflection of role and permission changes
- **Immediate Updates**: Role and permission changes now take effect immediately without waiting for cache expiration
- **Fresh Data Priority**: All permission checks now fetch fresh data from the database by default

### Removed
- **sessionCacheTTL Parameter**: Removed `sessionCacheTTL` from `GatekeeperNextAuthConfig` interface as session-level caching is no longer used
- **Default Cache Configuration**: Removed automatic cache enabling in examples and documentation

### Added
- **Optional Caching**: Caching can still be enabled by explicitly setting `cacheEnabled: true` in RBAC configuration for performance-critical applications
- **Real-time Permissions**: Permission changes are now reflected immediately in NextAuth sessions and permission checks

### Migration Guide
- **No Breaking Changes for Most Users**: If you weren't explicitly relying on caching behavior, no code changes needed
- **Performance Optimization**: For high-traffic applications, consider enabling caching manually: `createGatekeeper({ connector, cacheEnabled: true })`
- **NextAuth Configuration**: Remove any `sessionCacheTTL` parameters from `createGatekeeperCallbacks()` calls

## [1.2.3] - 2024-12-19

### Fixed
- **ESM/CJS Module Compatibility**: Added proper `exports` field in package.json to ensure correct module resolution in both ES modules and CommonJS environments
- **Import Issues**: Fixed `TypeError: Gatekeeper is not a constructor` by adding `Gatekeeper` as an alias export for the `RBAC` class
- **Module Resolution**: Both named imports (`import { Gatekeeper }`) and default imports (`import Gatekeeper`) now work correctly without type assertions

### Added
- **Gatekeeper Class Alias**: Added `Gatekeeper` as an exported alias for `RBAC` class to match user expectations
- **Dual Package Exports**: Configured proper exports map for seamless ESM/CJS interoperability

### Improved
- **Developer Experience**: Users can now import and use the library as expected: `import { Gatekeeper } from 'gatekeeper-rbac'` followed by `new Gatekeeper(config)`
- **Build Configuration**: Enhanced package configuration for better compatibility with modern JavaScript projects and Next.js applications

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