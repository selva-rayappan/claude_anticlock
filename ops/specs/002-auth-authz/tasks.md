---
description: "Task list for 003-auth-authz — Authentication & Authorisation"
---

# Tasks: Authentication & Authorisation

**Feature Branch**: `003-auth-authz`
**Input**: `specs/003-auth-authz/spec.md` · `specs/003-auth-authz/plan.md`
**Constitution**: `.specify/memory/constitution.md` v1.0.0

**Tech Stack**:
- Backend: Java 21 + Spring Boot 3.4.1 · `apps/api/src/main/java/io/opsnext/api/`
- Frontend: Next.js 15 App Router + React 19 + shadcn/ui · `apps/web/src/`
- DB: PostgreSQL 16 (schema-per-tenant) · Redis 7 (deny-list, lockout counters)
- Shared types: `packages/shared/src/`

**Constitution Gates** (enforced throughout):
- All session tokens carry `tenantId` claim; cross-tenant access MUST be impossible (Principle I)
- httpOnly cookie ONLY for refresh tokens — never localStorage (Principle IV)
- All auth events MUST emit structured logs: `tenantId`, `userId`, `event`, `ip`, `durationMs` (Principle VI)
- No stack traces in API error bodies; error codes MUST be machine-readable (Principles II + IV)
- Phase gate: localhost review + Product Owner approval before Phase 3 (Contacts) starts (Principle III)

---

## Phase 1: Setup

**Purpose**: DB migrations, shared types, and route scaffolding.

- [ ] T001 Create Flyway migration `V3__auth_sessions_mfa.sql` in `apps/api/src/main/resources/db/migration/` — adds `sessions`, `password_reset_tokens`, `mfa_configs` tables and `failed_attempts`, `lock_expires_at`, `mfa_enabled` columns to `users` table
- [ ] T002 [P] Add `UserRole` enum (`ADMIN`, `SALES_MANAGER`, `SALES_REP`, `READ_ONLY`) and `User` type to `packages/shared/src/types/user.ts`
- [ ] T003 [P] Add `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema` Zod schemas to `packages/shared/src/schemas/auth.ts`
- [ ] T004 [P] Register auth route prefixes (`/api/v1/auth/**`, `/api/v1/users/**`, `/api/v1/mfa/**`) in Spring Security config at `apps/api/src/main/java/io/opsnext/api/security/SecurityConfig.java`
- [ ] T005 [P] Add `paths.auth.*`, `paths.users.*`, `paths.mfa.*` URL helpers to `apps/web/src/lib/api.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core security infrastructure — JWT, session management, and RBAC evaluator.
All user stories depend on this being complete and correct.

**⚠️ CRITICAL**: No user story work begins until this phase is complete and verified.

- [ ] T006 Implement `JwtService` in `apps/api/src/main/java/io/opsnext/api/security/JwtService.java` — issues access tokens (8h, signed) containing `userId`, `tenantId`, `role`; validates tokens; maintains Redis deny-list for revoked tokens (`SETEX jwtDenyList:{jti} TTL ""`)
- [ ] T007 Implement `TenantAuthenticationFilter` in `apps/api/src/main/java/io/opsnext/api/security/TenantAuthenticationFilter.java` — extracts Bearer token per request, validates via `JwtService`, sets `TenantContext` and `SecurityContextHolder`; returns HTTP 401 for missing/invalid tokens
- [ ] T008 Implement `RolePermissionEvaluator` in `apps/api/src/main/java/io/opsnext/api/security/RolePermissionEvaluator.java` — defines `@PreAuthorize` expressions for `ADMIN`, `MANAGER`, `REP`, `READ_ONLY` roles; enforces: Read-Only → no writes; Rep → own records only for mutations; Manager → all tenant records; Admin → all including user management
- [ ] T009 [P] Implement `User` JPA entity in `apps/api/src/main/java/io/opsnext/api/user/User.java` — fields: id, tenantId, email, hashedPassword, role, isLocked, failedAttemptCount, lockExpiresAt, mfaEnabled, lastSignedInAt, createdAt; unique index on `(tenantId, email)`
- [ ] T010 [P] Implement `UserRepository` in `apps/api/src/main/java/io/opsnext/api/user/UserRepository.java` — Spring Data JPA; tenant-scoped queries
- [ ] T011 Implement `AuthEventLogger` in `apps/api/src/main/java/io/opsnext/api/audit/AuthEventLogger.java` — structured log emitter for: `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILURE`, `AUTH_LOGOUT`, `AUTH_LOCKOUT`, `AUTH_PASSWORD_RESET_REQUEST`, `AUTH_PASSWORD_RESET_COMPLETE`; all entries include `tenantId`, `userId`, `ip`, `durationMs`
- [ ] T012 [P] Add `auth-store.ts` Zustand store at `apps/web/src/lib/auth-store.ts` — holds `currentUser` (id, name, email, role, tenantId) + `setUser` / `clearUser` actions; initialised from `GET /api/v1/auth/me` on app mount
- [ ] T013 Implement auth middleware at `apps/web/src/middleware.ts` — redirects unauthenticated requests to `/login`; redirects authenticated users away from `(auth)` routes; reads session state from a cookie presence check

**Checkpoint**: JWT issues correctly, TenantFilter validates tokens, RBAC evaluator compiles, User entity migrates cleanly → user story work may begin.

---

## Phase 3: User Story 1 — Sign In & Sign Out (Priority: P1) 🎯 MVP

**Goal**: Users can authenticate with email/password, receive a session, and sign out
with immediate session invalidation.

**Independent Test**: Log in with valid credentials → verify dashboard loads. Sign out →
verify `/dashboard` redirects to `/login`. Confirm old session token is rejected.

### Backend — User Story 1

- [ ] T014 [P] [US1] Implement `AuthService.login(email, password, tenantSlug)` in `apps/api/src/main/java/io/opsnext/api/auth/AuthService.java` — verifies bcrypt hash, checks `isLocked`, issues access JWT + opaque refresh token (30d, stored in `sessions` table), logs `AUTH_LOGIN_SUCCESS`; returns HTTP 401 with `AUTH_INVALID_CREDENTIALS` on failure
- [ ] T015 [P] [US1] Implement `AuthService.logout(refreshToken)` — looks up session by token hash, sets `revokedAt`, adds JWT JTI to Redis deny-list; logs `AUTH_LOGOUT`
- [ ] T016 [P] [US1] Implement `AuthService.refresh(refreshToken)` — validates opaque token against `sessions` table, issues new access JWT; returns HTTP 401 if session expired or revoked
- [ ] T017 [US1] Implement `AuthController` in `apps/api/src/main/java/io/opsnext/api/auth/AuthController.java`:
  - `POST /api/v1/auth/login` → login (sets `Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict`)
  - `POST /api/v1/auth/logout` → logout (clears cookie)
  - `POST /api/v1/auth/refresh` → refresh (reads httpOnly cookie)
  - `GET /api/v1/auth/me` → returns current user profile from SecurityContext

### Frontend — User Story 1

- [ ] T018 [P] [US1] Implement `LoginForm` component at `apps/web/src/components/auth/login-form.tsx` — email + password fields with Zod validation; shows field errors inline; calls `POST /api/v1/auth/login`; redirects to dashboard on success
- [ ] T019 [P] [US1] Implement login page at `apps/web/src/app/(auth)/login/page.tsx` — renders `LoginForm`; shows "Forgot password?" link; handles suspended-tenant error state
- [ ] T020 [US1] Add `useLogin` and `useLogout` mutations to `apps/web/src/lib/queries/auth.ts` — `useLogin` sets `auth-store` user on success; `useLogout` calls logout endpoint then `clearUser()` and navigates to `/login`
- [ ] T021 [US1] Add `useMe` query to `apps/web/src/lib/queries/auth.ts` — fetches current user on app mount, populates `auth-store`; on 401 redirects to `/login`

**Checkpoint**: Full sign-in → dashboard → sign-out cycle verified on localhost.

---

## Phase 4: User Story 2 — Password Reset (Priority: P1)

**Goal**: A user who has forgotten their password can reset it via a one-time email link
valid for 24 hours, without revealing whether their email is registered.

**Independent Test**: Request reset for a known email → receive link → set new password →
sign in with new password → confirm old password is rejected.

### Backend — User Story 2

- [ ] T022 [P] [US2] Implement `PasswordResetToken` entity in `apps/api/src/main/java/io/opsnext/api/auth/PasswordResetToken.java` — fields: id, userId, tokenHash (SHA-256 of raw token), expiresAt, usedAt
- [ ] T023 [P] [US2] Implement `PasswordResetService` in `apps/api/src/main/java/io/opsnext/api/auth/PasswordResetService.java`:
  - `requestReset(email, tenantId)` — if user exists, generates cryptographically random token, stores hash, sends email via transactional email service; logs event; always returns success (no enumeration)
  - `resetPassword(rawToken, newPassword)` — validates token hash, checks expiry and `usedAt`; hashes new password; sets `usedAt`; clears `failedAttemptCount`; logs event
- [ ] T024 [US2] Implement `PasswordResetController` in `apps/api/src/main/java/io/opsnext/api/auth/PasswordResetController.java`:
  - `POST /api/v1/auth/forgot-password` → requestReset
  - `POST /api/v1/auth/reset-password` → resetPassword (accepts `{ token, newPassword }`)

### Frontend — User Story 2

- [ ] T025 [P] [US2] Implement `ForgotPasswordForm` at `apps/web/src/components/auth/forgot-password-form.tsx` — email field with Zod validation; on submit calls `POST /api/v1/auth/forgot-password`; shows neutral confirmation message regardless of result
- [ ] T026 [P] [US2] Implement `ResetPasswordForm` at `apps/web/src/components/auth/reset-password-form.tsx` — reads `?token=` from URL; new password + confirm fields; validates complexity; calls `POST /api/v1/auth/reset-password`; redirects to login on success
- [ ] T027 [US2] Implement forgot-password page at `apps/web/src/app/(auth)/forgot-password/page.tsx`
- [ ] T028 [US2] Implement reset-password page at `apps/web/src/app/(auth)/reset-password/page.tsx` — handles expired/used token error state with friendly message

**Checkpoint**: Full password reset flow verified end-to-end on localhost.

---

## Phase 5: User Story 3 — Role-Based Access Control (Priority: P1)

**Goal**: Tenant Admin assigns roles to users. The system enforces permissions on every
request. At least one Admin must always remain in the tenant.

**Independent Test**: Create one user per role. Verify each boundary: Read-Only blocked
from creating contacts; Rep blocked from user management; Manager can edit all records
but not tenant settings; Admin has full access. Last-Admin removal blocked.

### Backend — User Story 3

- [ ] T029 [P] [US3] Implement `UserService` in `apps/api/src/main/java/io/opsnext/api/user/UserService.java`:
  - `listUsers(tenantId, page, size)` — returns paginated user list for tenant
  - `updateUserRole(targetUserId, newRole, actorRole)` — enforces: only Admin can change roles; blocks removing last Admin; logs role change
  - `deactivateUser(targetUserId, actorUserId)` — soft-deactivates; blocks if last Admin
- [ ] T030 [US3] Implement `UserController` in `apps/api/src/main/java/io/opsnext/api/user/UserController.java`:
  - `GET /api/v1/users` → listUsers (Admin only, `@PreAuthorize("hasRole('ADMIN')")`)
  - `PUT /api/v1/users/{id}/role` → updateUserRole (Admin only)
  - `DELETE /api/v1/users/{id}` → deactivateUser (Admin only)
- [ ] T031 [US3] Annotate `ContactController` and `CompanyController` (from feature 001) with `@PreAuthorize` expressions from `RolePermissionEvaluator` — verifies Read-Only receives HTTP 403 on all write endpoints

### Frontend — User Story 3

- [ ] T032 [P] [US3] Implement Users settings page at `apps/web/src/app/(app)/settings/users/page.tsx` — paginated user table with name, email, role badge, "Change role" dropdown (Admin only), "Deactivate" button; locked accounts shown with unlock action
- [ ] T033 [P] [US3] Add `useUsers`, `useUpdateUserRole` hooks to `apps/web/src/lib/queries/users.ts`
- [ ] T034 [US3] Add role-aware UI guards in `apps/web/src/components/layout/sidebar.tsx` — hide "Settings → Users" nav item for non-Admin roles; hide "Add" buttons for Read-Only users
- [ ] T035 [US3] Add `RoleGuard` wrapper component at `apps/web/src/components/auth/role-guard.tsx` — renders children only if `currentUser.role` satisfies required role; otherwise shows 403 message or redirects

**Checkpoint**: All four roles verified with boundary-test checklist on localhost. Last-Admin protection confirmed.

---

## Phase 6: User Story 4 — Account Lockout (Priority: P2)

**Goal**: After 5 consecutive failed sign-in attempts within 10 minutes, the account
locks for 30 minutes. Tenant Admin can unlock early from the Users page.

**Independent Test**: Submit 5 wrong passwords for one account → verify 6th attempt
blocked. Verify Tenant Admin can unlock from Users page. Verify auto-unlock after 30 min.

### Backend — User Story 4

- [ ] T036 [US4] Update `AuthService.login()` to increment `failedAttemptCount` (via Redis counter with 10-minute window TTL) on each failed attempt; on reaching 5, set `isLocked = true` and `lockExpiresAt = now + 30min` on the User record; log `AUTH_LOCKOUT`
- [ ] T037 [US4] Update `AuthService.login()` to check `isLocked` and `lockExpiresAt` at start of every login attempt — auto-unlock if `lockExpiresAt` has passed; return `AUTH_ACCOUNT_LOCKED` with `lockExpiresAt` in response body when locked
- [ ] T038 [US4] Add `UserService.unlockUser(targetUserId)` — resets `isLocked`, `failedAttemptCount`, `lockExpiresAt`; Admin only; logs unlock event
- [ ] T039 [US4] Add `PUT /api/v1/users/{id}/unlock` to `UserController` — calls `unlockUser`; Admin only

### Frontend — User Story 4

- [ ] T040 [P] [US4] Update `LoginForm` to handle `AUTH_ACCOUNT_LOCKED` error — display lockout message with remaining time (computed from `lockExpiresAt` in error response body)
- [ ] T041 [P] [US4] Add "Unlock" button to Users settings page (`apps/web/src/app/(app)/settings/users/page.tsx`) — visible only for locked accounts; calls `PUT /api/v1/users/{id}/unlock`; invalidates users query on success

**Checkpoint**: Lockout triggers correctly; admin unlock works; auto-unlock after 30 min confirmed.

---

## Phase 7: User Story 5 — TOTP Multi-Factor Authentication (Priority: P3)

**Goal**: Users can optionally enable TOTP MFA from Security Settings. Once enabled,
sign-in requires a valid TOTP code. Backup recovery codes allow emergency access.

**Independent Test**: Enable MFA via QR scan + confirmation code. Sign out. Sign back in
— verify TOTP prompt appears. Enter invalid code — verify rejection. Use backup recovery
code — verify access granted and user prompted to reconfigure.

### Backend — User Story 5

- [ ] T042 [P] [US5] Implement `MfaConfig` entity in `apps/api/src/main/java/io/opsnext/api/mfa/MfaConfig.java` — fields: userId, otpSecretEncrypted (AES-256-GCM), recoveryCodes (array of bcrypt hashes), enabledAt
- [ ] T043 [US5] Implement `MfaService` in `apps/api/src/main/java/io/opsnext/api/mfa/MfaService.java`:
  - `setupMfa(userId)` — generates TOTP secret, encrypts, stores as pending (not enabled); returns secret + QR code URI + 8 recovery codes
  - `confirmMfa(userId, totpCode)` — validates code against pending secret; if valid, sets `enabledAt`, persists hashed recovery codes; enables MFA on User record
  - `validateTotp(userId, code)` — validates 6-digit code or single-use recovery code (marks used); returns true/false
  - `disableMfa(userId, totpCode)` — requires valid code to disable; clears `MfaConfig`
- [ ] T044 [US5] Implement `MfaController` in `apps/api/src/main/java/io/opsnext/api/mfa/MfaController.java`:
  - `POST /api/v1/mfa/setup` → setupMfa (returns QR URI + recovery codes)
  - `POST /api/v1/mfa/confirm` → confirmMfa
  - `POST /api/v1/mfa/disable` → disableMfa
- [ ] T045 [US5] Update `AuthService.login()` MFA flow: if `user.mfaEnabled`, issue a short-lived `MFA_PENDING` token instead of a full session; add `POST /api/v1/auth/mfa-verify` endpoint that accepts TOTP code + `MFA_PENDING` token, validates, and issues full session on success

### Frontend — User Story 5

- [ ] T046 [P] [US5] Implement `MfaSetupWizard` component at `apps/web/src/components/auth/mfa-setup-wizard.tsx` — step 1: displays QR code (using `qrcode.react`) and secret; step 2: TOTP confirmation code input; step 3: recovery codes display (copy/download); calls `POST /api/v1/mfa/setup` then `POST /api/v1/mfa/confirm`
- [ ] T047 [US5] Implement Security Settings page at `apps/web/src/app/(app)/settings/security/page.tsx` — shows MFA status (enabled/disabled); "Enable MFA" launches `MfaSetupWizard`; "Disable MFA" requires TOTP confirmation
- [ ] T048 [US5] Update `LoginForm` to handle `MFA_REQUIRED` response — show TOTP code input step after successful password entry; call `POST /api/v1/auth/mfa-verify`; handle recovery code path

**Checkpoint**: MFA enable/disable cycle verified; TOTP prompt on login verified; recovery code access verified.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Security hardening, observability, and pre-gate-review quality pass.

- [ ] T049 [P] Verify all API error responses are sanitised — no stack traces, no internal identifiers; confirm `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_LOCKED`, `AUTH_TOKEN_EXPIRED`, `MFA_REQUIRED`, `MFA_INVALID_CODE`, `INSUFFICIENT_PERMISSIONS` error codes are machine-readable and documented
- [ ] T050 [P] Add structured log assertions: verify every auth event produces a log entry with `tenantId`, `userId` (or "anonymous"), `event`, `ip`, `durationMs`; check login, logout, lockout, reset flows
- [ ] T051 [P] Validate no user-enumeration leaks: `/api/v1/auth/login` and `/api/v1/auth/forgot-password` MUST return identical response shapes for existing vs. non-existing emails — manual verification
- [ ] T052 Security review: verify `refreshToken` cookie is `HttpOnly; Secure; SameSite=Strict`; verify CSRF protection is in place for cookie-based auth flows
- [ ] T053 [P] Add "Sign out of all devices" capability: `POST /api/v1/auth/logout-all` — revokes all active sessions for the current user in the `sessions` table and adds all their JTIs to deny-list; wire to a button in Security Settings page
- [ ] T054 Run localhost validation: all 5 user story independent tests pass; RBAC boundary-test checklist complete; prepare phase-gate summary for Product Owner review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks all user stories
- **Phase 3 (US1 Sign-In)**: Depends on Phase 2 — no dependency on Phases 4–7
- **Phase 4 (US2 Password Reset)**: Depends on Phase 2 — independent of Phase 3
- **Phase 5 (US3 RBAC)**: Depends on Phase 2 — builds on User entity from Phase 2
- **Phase 6 (US4 Lockout)**: Depends on Phase 3 (extends `AuthService.login()`)
- **Phase 7 (US5 MFA)**: Depends on Phase 3 (extends login flow)
- **Phase 8 (Polish)**: Depends on all desired phases complete

### Within Each User Story

- Entities / DB migrations before services
- Services before controllers
- Backend controllers before frontend query hooks
- Query hooks before page/component wiring

### Parallel Opportunities

- All Phase 1 tasks (T001–T005) parallelisable immediately
- All Phase 2 tasks (T006–T013) parallelisable within the phase
- Once Phase 2 is done: US1 (Phase 3) and US2 (Phase 4) can run in parallel
- Within each story: backend tasks marked `[P]` can run in parallel
- Frontend and backend tasks within a story can run in parallel once shared types (Phase 1) are done

---

## Implementation Strategy

### MVP First (P1 Stories Only — Phases 1–5)

1. Phase 1: Setup (T001–T005)
2. Phase 2: Foundational (T006–T013) — CRITICAL, blocks everything
3. Phase 3: US1 Sign In/Out (T014–T021)
4. Phase 4: US2 Password Reset (T022–T028)
5. Phase 5: US3 RBAC (T029–T035)
6. **STOP**: Full auth + RBAC on localhost → present for Product Owner phase-gate review

### Incremental Delivery

- MVP above → Auth fully functional, all roles enforced
- Add Phase 6 (Lockout) → brute-force protection
- Add Phase 7 (MFA) → optional security uplift
- Phase 8 Polish → security hardening pass → phase-gate sign-off

### Parallel Team Strategy

- Developer A: Backend (T006–T017, T022–T031, T036–T039, T042–T045)
- Developer B: Frontend (T018–T021, T025–T028, T032–T035, T040–T041, T046–T048)
- Both unblock after Phase 2 completes (T006–T013)

---

## Notes

- `[P]` = parallelisable (different files, no incomplete dependencies)
- `[USn]` = maps to User Story n in `specs/003-auth-authz/spec.md`
- httpOnly cookie enforcement is non-negotiable — Constitution Principle IV
- All auth events MUST be logged — Constitution Principle VI
- Phase gate review (T054) MUST complete before Phase 3 (Contacts) implementation begins — Constitution Principle III
- Commit format: `feat(auth): T014 implement AuthService.login()`
