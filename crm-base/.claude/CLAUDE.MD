# Project: [Your Project Name]

## Tech Stack
- **Language:** TypeScript
- **Framework:** Next.js
- **Database:** PostgreSQL
- **Deployment:** AWS

## Common Commands
npm run dev          # Start development
npm test             # Run tests
npm run build        # Production build

## Project Structure
src/
  app/        # Routes and pages
  components/ # UI components
  lib/        # Utilities and business logic
  tests/      # Test files

## Code Standards
- Use TypeScript strict mode
- Functional components only (no class components)
- Prisma ORM for all database access (no raw SQL)
- Test coverage minimum: 80%
- File naming: PascalCase for components, camelCase for utilities

## Critical Rules
- NEVER store secrets in code (use environment variables)
- ALWAYS validate input server-side
- ALWAYS write tests for business logic