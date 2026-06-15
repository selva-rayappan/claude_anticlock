# Coding Standards

## General (All Languages)

- **No comments unless the WHY is non-obvious.** A comment must explain a hidden constraint, subtle invariant, or surprising workaround — never what the code does.
- **No multi-line docstrings or comment blocks.**
- **No emojis, no TODO comments in committed code** — use the task backlog instead.
- **Prefer editing existing files** over creating new ones.
- **No speculative abstractions.** Three similar lines is better than a premature abstraction.
- **No backwards-compatibility hacks** for removed code.
- **No feature flags** — just change the code.
- **No error handling for scenarios that cannot happen.** Trust framework guarantees.

---

## Java (Backend — `backend/`)

### Package Structure

```
io.opsnext.api/
├── config/           — Spring @Configuration classes
├── security/         — JWT filter, SecurityPrincipal, auth services
├── tenant/           — TenantContext, tenant resolution middleware
├── common/
│   ├── dto/          — ApiResponse<T>, PageResponse<T>
│   └── exception/    — AppException, GlobalExceptionHandler
└── {module}/         — One package per domain module
    ├── {Module}Controller.java
    ├── {Module}Service.java
    ├── {Module}Repository.java
    └── dto/
        ├── {Module}Request.java
        └── {Module}Response.java
```

### Naming

| Construct | Convention | Example |
|-----------|-----------|---------|
| Class | PascalCase | `ContactService` |
| Method | camelCase | `findByTenantAndId` |
| Constant | SCREAMING_SNAKE | `MAX_FAILED_ATTEMPTS` |
| Package | lowercase.dots | `io.opsnext.api.contact` |
| DB column (via JPA) | snake_case | `created_at` |
| REST path | kebab-case | `/api/v1/contact-groups` |

### Spring Boot Conventions

- Use constructor injection (`@RequiredArgsConstructor`) — never `@Autowired` on fields.
- Controller methods return `ResponseEntity<ApiResponse<T>>` for consistency.
- Service layer throws `AppException` (not `RuntimeException` subclasses directly); `GlobalExceptionHandler` maps to HTTP responses.
- Use `@PreAuthorize` on service methods for RBAC, not on controllers.
- Keep `@Transactional` on service methods, not repositories or controllers.
- Every service method that mutates a core entity must write to `AuditLog` within the same transaction.
- All tenant-scoped queries implicitly use the schema set by `TenantContext` — never pass `tenantId` as a WHERE clause.

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact with id abc123 does not exist in this tenant",
    "details": [],
    "traceId": "abc-123"
  }
}
```

### DTOs

- Use Java records for immutable request/response DTOs.
- Bean Validation annotations (`@NotBlank`, `@Email`, `@Size`) on request records.
- Never expose JPA entity objects in API responses — always map to a response DTO.

---

## TypeScript / React (Frontend — `frontend/`)

### File & Folder Naming

| Construct | Convention | Example |
|-----------|-----------|---------|
| React component file | kebab-case | `contact-slideover.tsx` |
| Component export | PascalCase | `export function ContactSlideover` |
| Hook | camelCase, `use` prefix | `useContactList.ts` |
| Store | camelCase, `.store.ts` suffix | `auth.store.ts` |
| Utility | camelCase | `formatCurrency.ts` |
| Type file | kebab-case | `contact.types.ts` |

### Component Rules

- **Server Components by default** for data-fetching pages in App Router.
- Add `"use client"` only when the component uses state, effects, or event handlers.
- Never call the API directly from a Server Component that will be re-used client-side — use TanStack Query in a Client Component.
- All API calls go through `src/lib/api.ts` (axios instance with auth interceptor).
- Form state lives in React Hook Form. Do not use `useState` for form fields.

### State Management

| State Type | Where It Lives |
|-----------|---------------|
| Server/async data | TanStack Query (`useQuery`, `useMutation`) |
| Global UI state | Zustand store (`src/store/`) |
| Local ephemeral state | `useState` |
| Form state | React Hook Form |
| URL state | `useSearchParams` / Next.js router |

### Validation

- All schemas defined in `packages/shared/src/schemas/` using Zod.
- Never duplicate validation between frontend and backend — share schemas via `@opsnext/shared`.
- Use `zodResolver` from `@hookform/resolvers/zod` for form validation.

### Tailwind / shadcn/ui

- Use `cn()` utility (`src/lib/utils.ts`) to merge Tailwind classes.
- Follow shadcn/ui variants — do not override component internals; extend via `className` prop.
- Tenant primary colour applied via CSS custom property `--primary`; never hardcode brand colours.
- Responsive: mobile-first (`sm:`, `md:`, `lg:` prefixes on exceptions, not the base case).

### Async Error Handling

- Use TanStack Query's `onError` / `error` for server errors in UI.
- Show toast notification for user-facing errors via the `useToast` hook.
- Never swallow errors silently.

---

## Database / Prisma (`packages/db/`)

- All migrations are **additive only** for live tenants — never drop or rename columns in a single migration.
- Soft delete pattern: `deletedAt DateTime?` column; all standard list queries use `where: { deletedAt: null }`.
- All timestamps in UTC. Column names: `createdAt`, `updatedAt`, `deletedAt`.
- Custom fields stored as `Json` JSONB column named `customFields` on core entities.
- GIN indexes on `tags` (text[]) and `customFields` (Json) columns.
- Index naming: `{table}_{columns}_idx`.
