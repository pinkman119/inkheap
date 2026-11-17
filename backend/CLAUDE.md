# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
npm run start          # Start application
npm run start:dev      # Start with watch mode
npm run start:debug    # Start with debug and watch
npm run start:prod     # Start production build

# Build & Quality
npm run build          # Build to dist/
npm run lint           # Run ESLint with auto-fix
npm run format         # Format with Prettier

# Tests
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Generate coverage report
npm run test:e2e       # Run e2e tests
npm run test:debug     # Debug tests
```

## Architecture

This is a NestJS backend application with a layered directory structure:

```
src/
├── config/           # Configuration modules (env, app config, etc.)
├── common/           # Shared utilities
│   ├── constants/    # Application constants
│   ├── decorators/   # Custom decorators
│   ├── dto/          # Shared DTOs
│   ├── filters/      # Exception filters
│   ├── guards/       # Route guards
│   ├── interceptors/ # Interceptors
│   ├── interfaces/   # TypeScript interfaces
│   ├── pipes/        # Validation/transform pipes
│   └── utils/        # Utility functions
├── modules/          # Feature modules (e.g., user, auth)
└── main.ts           # Application entry point
```

- **Modules**: Each business feature is a module under `src/modules/`. A typical module includes its own controller, service, DTOs, and module file.
- **Config**: Environment and application configuration should be placed in `src/config/`.
- **Common**: Reusable cross-cutting concerns (guards, decorators, etc.) go in `src/common/`.

## Notes

- TypeScript uses `nodenext` module resolution
- ESLint uses the new flat config format (`eslint.config.mjs`)
- Default port: 3000 (can be overridden via `PORT` env var)
- Use `nest-cli.json` for NestJS-specific CLI options