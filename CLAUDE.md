# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gatekeeper RBAC is a comprehensive TypeScript library for role-based access control with NextAuth.js integration. It provides Google IAM-style granular permissions, hierarchical groups, conditional permissions, and database-agnostic design.

## Development Commands

### Build and Development
```bash
npm install          # Install dependencies
npm run build        # Build the library
npm run dev          # Build in watch mode
```

### Testing and Quality
```bash
npm test            # Run Jest tests
npm run test:watch  # Run tests in watch mode
npm run lint        # Run ESLint
npm run typecheck   # Run TypeScript type checking
```

### Common Workflows
- Always run `npm run typecheck` and `npm run lint` before committing
- Use `npm run build` to verify the library builds correctly
- Run `npm test` to ensure all tests pass

## Architecture

### Core Components

1. **Core Module** (`src/core/`)
   - `types.ts` - All TypeScript interfaces and types
   - `rbac.ts` - Main RBAC orchestrator class
   - `permission-engine.ts` - Permission evaluation logic with wildcard matching

2. **Database Connectors** (`src/connectors/`)
   - `firebase.ts` - Firebase Firestore connector implementation
   - Follows DatabaseConnector interface for consistent API

3. **NextAuth Integration** (`src/nextauth/`)
   - React hooks, HOCs, and middleware for NextAuth.js
   - Server-side permission checking utilities
   - JWT/session callbacks for permission inclusion

4. **Templates** (`src/templates/`)
   - Pre-built roles, groups, and permission patterns
   - Template builder for creating reusable permission sets
   - Common organizational structures

5. **Utilities** (`src/utils/`)
   - Permission parsing and matching utilities
   - Group hierarchy flattening
   - Validation and debugging helpers

### Key Design Patterns

- **Database Abstraction**: All database operations go through connector interface
- **Permission Engine**: Centralized permission evaluation with caching
- **Conditional Permissions**: Context-aware permission checking with operators
- **Hierarchical Groups**: Nested group membership with permission inheritance
- **Template System**: Reusable permission patterns and organizational structures

### Permission Format

Permissions use dot notation: `resource.action` or `service.resource.action`
- Wildcards supported: `users.*`, `*.read`, `*`
- Conditional permissions with context evaluation
- Deny rules override allow rules

## File Structure

```
src/
├── core/           # Core RBAC logic
├── connectors/     # Database connectors
├── nextauth/       # NextAuth.js integration
├── templates/      # Permission templates
├── utils/          # Utility functions
└── index.ts        # Main exports

examples/
├── basic/          # Basic usage examples
├── nextauth/       # NextAuth integration examples
├── firebase/       # Firebase-specific examples
└── advanced/       # Complex permission scenarios
```

## Testing Philosophy

The library emphasizes type safety and comprehensive testing:
- Unit tests for core permission logic
- Integration tests for database connectors
- Example-driven development for real-world scenarios

## NextAuth Integration Notes

When working with NextAuth features:
- Session callbacks include permissions, roles, and groups
- Hooks provide client-side permission checking
- Middleware and HOCs protect routes and components
- Server-side utilities for API route protection