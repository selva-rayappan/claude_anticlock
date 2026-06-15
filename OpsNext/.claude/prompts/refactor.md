# Prompt: Refactor

Use this when improving code structure, removing duplication, or improving readability without changing behaviour.

---

## Instruction Template

```
Refactor: [one-sentence description of what to improve]

Location: [file path(s) or class name(s)]

Current problem:
[What is wrong — duplication, unclear naming, violation of a principle, performance issue, etc.]

Target state:
[What it should look like after refactoring]

Constraints:
- Must not change observable behaviour (same inputs → same outputs, same side effects)
- Existing tests must pass before and after
- Do not refactor outside the stated scope
```

---

## Rules for Refactoring in OpsNext

1. **Tests must exist before you start.** If there are no tests covering the code, write them first, then refactor.
2. **One change type per commit.** Rename in one commit, restructure in another — do not mix.
3. **Do not opportunistically clean up nearby code.** Scope creep breaks reviewability.
4. **Do not introduce new abstractions** unless they reduce duplication across 3+ call sites.
5. **Do not change the API contract** (endpoint paths, request/response shapes) in a refactor — that is a breaking change, not a refactor.
6. **Do not change test behaviour** — update test code only to reflect renamed identifiers.

---

## Common Refactor Patterns

### Extract Service Method

When a controller method is doing business logic:

```java
// Before: logic in controller
// After: logic extracted to service with @Transactional + @PreAuthorize
```

### Consolidate Duplicated Repository Queries

When the same query appears in multiple services:

```java
// Add a named method to the Repository interface
// Replace all call sites
```

### Replace Magic Strings with Enums

```java
// Before: if (status.equals("ACTIVE"))
// After:  if (status == UserStatus.ACTIVE)
```

### Extract Shared Zod Schema (Frontend)

When the same shape is validated in multiple components:

```typescript
// Move to packages/shared/src/schemas/{resource}.schema.ts
// Import via @opsnext/shared in both files
```

### Replace useState with useSearchParams for Filter State

When filter/sort state is in component state but should survive navigation:

```typescript
// Before: const [filter, setFilter] = useState(defaultFilter)
// After:  const [searchParams, setSearchParams] = useSearchParams()
```

---

## Do Not Refactor

- Code in a phase not yet completed — finish the feature first.
- Code you do not understand fully — investigate first.
- Working code that is simply "not how I would write it" — subjective style is not a defect.
