---
description: "Task list for 004-account-mgmt — Account Management"
---

# Tasks: Account Management

**Feature Branch**: `004-account-mgmt`
**Input**: `specs/004-account-mgmt/spec.md` · `specs/004-account-mgmt/plan.md`
**Constitution**: `.specify/memory/constitution.md` v1.0.0

**Tech Stack**:
- Backend: Java 21 + Spring Boot 3.4.1 · `apps/api/src/main/java/io/opsnext/api/`
- Frontend: Next.js 15 App Router + React 19 + shadcn/ui · `apps/web/src/`
- DB: PostgreSQL 16 (schema-per-tenant) · Redis 7 (token deny-list, session invalidation)
- Object Storage: MinIO (avatar images, pre-signed PUT URLs)

**Constitution Gates** (enforced throughout):
- All entities in `tenant_{slug}` schema; TenantJdbcTemplate for all DB access (Principle I)
- All 11 account endpoints versioned under `/api/v1/account/`; `{ data, meta, errors }` envelope (Principle II)
- Phase gate: localhost review + Product Owner approval before next feature starts (Principle III)
- SHA-256 token hash only — raw value never persisted or logged; deletion revokes all sessions via Redis deny-list (Principle IV)
- All account events emit structured logs: `tenantId`, `userId`, `operation`, `durationMs`, `outcome` (Principle VI)

---

## Phase 1: Setup

**Purpose**: Database migrations, shared types, Zod schemas, and route scaffolding.

- [ ] T001 Create Flyway migration `V004.1__user_profile.sql` in `apps/api/src/main/resources/db/migration/tenant/` — adds `user_profile` table (userId PK FK→users, firstName, lastName, jobTitle, avatarUrl, updatedAt)
- [ ] T002 [P] Create Flyway migration `V004.2__notification_preference.sql` in `apps/api/src/main/resources/db/migration/tenant/` — adds `notification_category` enum and `notification_preference` table (userId + category composite PK, inAppEnabled, emailEnabled; default TRUE/TRUE)
- [ ] T003 [P] Create Flyway migration `V004.3__personal_api_token.sql` in `apps/api/src/main/resources/db/migration/tenant/` — adds `personal_api_token` table (id UUID PK, userId, tenantId, name, tokenHash UNIQUE, createdAt, lastUsedAt, revokedAt) with partial index on active tokens
- [ ] T004 [P] Add shared TypeScript types `UserProfile`, `NotificationPreference`, `PersonalApiToken` to `packages/shared/src/types/account.ts`
- [ ] T005 [P] Add Zod schemas `updateProfileSchema`, `changePasswordSchema`, `updateNotificationPrefsSchema`, `createTokenSchema` to `packages/shared/src/schemas/account.ts`
- [ ] T006 [P] Register `/api/v1/account/**` route prefix with authenticated-only access in `apps/api/src/main/java/io/opsnext/api/security/SecurityConfig.java`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core entities, audit logger, Zustand store, and API token auth filter.
All user stories depend on this phase being complete.

**⚠️ CRITICAL**: No user story work begins until this phase is complete and verified.

- [ ] T007 Implement `UserProfile` JPA entity in `apps/api/src/main/java/io/opsnext/api/account/UserProfile.java` — fields: userId (PK, FK→users), firstName, lastName, jobTitle, avatarUrl, updatedAt; tenant-scoped via `TenantJdbcTemplate`
- [ ] T008 [P] Implement `NotificationPreference` JPA entity in `apps/api/src/main/java/io/opsnext/api/notification/NotificationPreference.java` — composite PK (userId, category enum); inAppEnabled, emailEnabled booleans
- [ ] T009 [P] Implement `PersonalApiToken` JPA entity in `apps/api/src/main/java/io/opsnext/api/token/PersonalApiToken.java` — fields: id, userId, tenantId, name, tokenHash, createdAt, lastUsedAt, revokedAt; active-only index
- [ ] T010 Implement `AccountEventLogger` in `apps/api/src/main/java/io/opsnext/api/account/AccountEventLogger.java` — structured log emitter for events: `PROFILE_UPDATED`, `AVATAR_UPDATED`, `AVATAR_REMOVED`, `PASSWORD_CHANGED`, `NOTIFICATION_PREFS_UPDATED`, `TOKEN_CREATED`, `TOKEN_REVOKED`, `ACCOUNT_DELETED`; all entries include `tenantId`, `userId`, `operation`, `durationMs`, `outcome`
- [ ] T011 [P] Add `account-store.ts` Zustand store at `apps/web/src/lib/account-store.ts` — holds `currentUserProfile` (firstName, lastName, avatarUrl) + `setProfile` / `clearProfile` actions; drives topbar display name and avatar
- [ ] T012 Implement `ApiTokenAuthFilter` in `apps/api/src/main/java/io/opsnext/api/token/ApiTokenAuthFilter.java` — intercepts `Authorization: Bearer` headers that are not JWTs (no `.` separator); SHA-256-hashes the raw value, checks Redis deny-list, then looks up in `personal_api_token` by hash; sets `TenantContext` and `SecurityContextHolder`; updates `lastUsedAt` asynchronously; rejects revoked/missing tokens with HTTP 401 `TOKEN_INVALID`

**Checkpoint**: Entities migrate cleanly, AccountEventLogger compiles, ApiTokenAuthFilter integrates into filter chain → user story work may begin.

---

## Phase 3: User Story 1 — Edit Profile (Priority: P1) 🎯 MVP

**Goal**: Users can update their display name, job title, and avatar from Account Settings,
with changes reflected immediately across the application.

**Independent Test**: Sign in → navigate to Settings → Profile. Update first name and upload a
PNG avatar → save. Verify topbar shows new name and avatar. Clear avatar → verify initials
fallback appears. No other account management feature needed.

### Backend — User Story 1

- [ ] T013 [P] [US1] Implement `AccountService.getProfile(userId)` and `AccountService.updateProfile(userId, dto)` in `apps/api/src/main/java/io/opsnext/api/account/AccountService.java` — fetch UserProfile (create default row if absent), update firstName/lastName/jobTitle, set updatedAt=now(); emit `PROFILE_UPDATED` structured log
- [ ] T014 [P] [US1] Implement `AccountController` in `apps/api/src/main/java/io/opsnext/api/account/AccountController.java`:
  - `GET /api/v1/account/profile` → returns current user's UserProfile
  - `PUT /api/v1/account/profile` → updates name/jobTitle fields; returns updated profile
- [ ] T015 [US1] Implement `AvatarController` in `apps/api/src/main/java/io/opsnext/api/account/AvatarController.java`:
  - `POST /api/v1/account/avatar` → validates Content-Type and size claim (≤ 2 MB), generates MinIO pre-signed PUT URL for `avatars/{tenantId}/{userId}`, returns URL and object key; persists object key as `avatarUrl` on upload completion callback
  - `DELETE /api/v1/account/avatar` → clears `avatarUrl` in UserProfile; emits `AVATAR_REMOVED` log

### Frontend — User Story 1

- [ ] T016 [P] [US1] Implement `ProfileForm` component at `apps/web/src/components/settings/profile-form.tsx` — firstName, lastName, jobTitle fields; react-hook-form + Zod validation; saves via `PUT /api/v1/account/profile`; calls `setProfile` on account-store on success
- [ ] T017 [P] [US1] Implement `AvatarUploader` component at `apps/web/src/components/settings/avatar-uploader.tsx` — file picker (PNG/JPG only, 2 MB max enforced client-side); uploads to pre-signed PUT URL; shows inline error on invalid file type or oversized file; Remove button clears avatar via `DELETE /api/v1/account/avatar`; initials fallback when `avatarUrl` is null
- [ ] T018 [US1] Implement Profile settings page at `apps/web/src/app/(app)/settings/profile/page.tsx` — renders `AvatarUploader` + `ProfileForm`
- [ ] T019 [P] [US1] Add `useProfile` and `useUpdateProfile` TanStack Query hooks to `apps/web/src/lib/queries/account.ts` — `useProfile` fetches `GET /api/v1/account/profile`; `useUpdateProfile` mutation calls `PUT /api/v1/account/profile` and invalidates profile query cache on success
- [ ] T020 [US1] Wire `account-store.ts` into the app topbar at `apps/web/src/components/layout/topbar.tsx` — display name and avatar read from `account-store`; update immediately when `setProfile` is called (no page refresh required)

**Checkpoint**: Profile update and avatar cycle fully functional. Topbar reflects changes in real time. US1 testable independently.

---

## Phase 4: User Story 2 — Change Password (Priority: P1)

**Goal**: Users can change their own password from Security Settings by providing their
current password and a complexity-valid new password. The current session stays active.

**Independent Test**: Sign in → Settings → Security → enter correct current password and
valid new password → save. Sign out and sign back in with new password — succeeds. Attempt
sign-in with old password — rejected with 401.

### Backend — User Story 2

- [ ] T021 [P] [US2] Implement `PasswordChangeService` in `apps/api/src/main/java/io/opsnext/api/auth/PasswordChangeService.java` — verifies current password via bcrypt compare; rejects if new password fails complexity (min 8 chars, one upper, one lower, one digit); rejects if new password equals current; re-hashes and saves; does NOT invalidate current session; emits `PASSWORD_CHANGED` structured log
- [ ] T022 [US2] Implement `PasswordChangeController` in `apps/api/src/main/java/io/opsnext/api/auth/PasswordChangeController.java`:
  - `POST /api/v1/account/password` — returns 204 on success; 400 `CURRENT_PASSWORD_INCORRECT`; 400 `PASSWORD_TOO_WEAK`; 400 `PASSWORD_SAME_AS_CURRENT`

### Frontend — User Story 2

- [ ] T023 [P] [US2] Implement `ChangePasswordForm` component at `apps/web/src/components/settings/change-password-form.tsx` — current password, new password, confirm new password fields; Zod schema enforces complexity client-side; shows per-field inline errors; calls `POST /api/v1/account/password`; resets form on success with confirmation toast
- [ ] T024 [US2] Implement Security settings page at `apps/web/src/app/(app)/settings/security/page.tsx` — renders `ChangePasswordForm`; includes a "Danger Zone" section placeholder for account deletion (US5)
- [ ] T025 [P] [US2] Add `useChangePassword` mutation hook to `apps/web/src/lib/queries/password.ts` — calls `POST /api/v1/account/password`; maps API error codes to user-facing messages

**Checkpoint**: Password change functional. Old password rejected after change. Session persists. US2 testable independently.

---

## Phase 5: User Story 3 — Notification Preferences (Priority: P2)

**Goal**: Users can independently toggle in-app and email channels for five notification
categories. Changes take effect within 30 seconds for all subsequent events.

**Independent Test**: Disable email for "Task Reminders" → save. Trigger a task reminder
event → verify no email sent but in-app notification appears. Re-enable → verify both
channels fire.

### Backend — User Story 3

- [ ] T026 [P] [US3] Implement `NotificationPreferenceService.getAll(userId)` and `upsertAll(userId, prefs)` in `apps/api/src/main/java/io/opsnext/api/notification/NotificationPreferenceService.java` — `getAll` returns all 5 category rows defaulting to TRUE/TRUE if not yet stored; `upsertAll` bulk-upserts all rows and invalidates Redis cache key `notif_prefs:{tenantId}:{userId}`; emits `NOTIFICATION_PREFS_UPDATED` log
- [ ] T027 [US3] Implement `NotificationPreferenceController` in `apps/api/src/main/java/io/opsnext/api/notification/NotificationPreferenceController.java`:
  - `GET /api/v1/account/notification-preferences` → returns all 5 category preference rows
  - `PUT /api/v1/account/notification-preferences` → bulk-upserts; returns updated rows

### Frontend — User Story 3

- [ ] T028 [P] [US3] Implement `NotificationPrefsForm` component at `apps/web/src/components/settings/notification-prefs-form.tsx` — 5 category rows (Task Reminders, Deal Stage Changes, Contact Assignments, @Mentions in Notes, Weekly Summary); each row shows two shadcn `Switch` toggles (In-App, Email); optimistic update on toggle with auto-save (debounced 500 ms); calls `PUT /api/v1/account/notification-preferences`
- [ ] T029 [US3] Implement Notifications settings page at `apps/web/src/app/(app)/settings/notifications/page.tsx` — renders `NotificationPrefsForm`; loading skeleton while preferences fetch
- [ ] T030 [P] [US3] Add `useNotificationPrefs` and `useUpdateNotificationPrefs` hooks to `apps/web/src/lib/queries/notifications.ts` — query fetches `GET /api/v1/account/notification-preferences`; mutation calls `PUT` and invalidates query on success

**Checkpoint**: Toggling any preference and verifying it persists across page reload. Notification dispatch layer respects the saved preferences. US3 testable independently.

---

## Phase 6: User Story 4 — Personal API Tokens (Priority: P2)

**Goal**: Users can generate named personal API tokens for third-party integrations, see
the raw value exactly once at creation, and revoke tokens with immediate effect.

**Independent Test**: Generate token "Excel Test" → copy raw value. Make API call with
`Authorization: Bearer <token>` → verify 200 with tenant-scoped data. Revoke token → same
API call returns 401 `TOKEN_INVALID`. Verify only 5 active tokens allowed.

### Backend — User Story 4

- [ ] T031 [P] [US4] Implement `ApiTokenService.generate(userId, tenantId, name)` in `apps/api/src/main/java/io/opsnext/api/token/ApiTokenService.java` — count active (non-revoked) tokens for user; reject with `TOKEN_LIMIT_REACHED` if ≥ 5; generate 32-byte `SecureRandom` token; SHA-256 hash for storage; persist `PersonalApiToken`; return raw token exactly once; emit `TOKEN_CREATED` log
- [ ] T032 [P] [US4] Implement `ApiTokenService.revoke(tokenId, userId)` — set `revokedAt = now()`; add token hash to Redis deny-list (`SETEX patDenyList:{hash} TTL ""`); emit `TOKEN_REVOKED` log; verify ownership before revoking (403 if token belongs to another user)
- [ ] T033 [US4] Implement `ApiTokenController` in `apps/api/src/main/java/io/opsnext/api/token/ApiTokenController.java`:
  - `GET /api/v1/account/tokens` → list active tokens (id, name, createdAt, lastUsedAt; NO tokenHash or raw value)
  - `POST /api/v1/account/tokens` → create; response includes `rawToken` (one-time only) + token metadata
  - `DELETE /api/v1/account/tokens/{id}` → revoke; returns 204

### Frontend — User Story 4

- [ ] T034 [P] [US4] Implement `TokenList` component at `apps/web/src/components/settings/token-list.tsx` — table showing token name, created date, last used date; Revoke button per row with confirmation prompt; empty state "No tokens yet — generate your first token"
- [ ] T035 [P] [US4] Implement `CreateTokenDialog` at `apps/web/src/components/settings/create-token-dialog.tsx` — name input (required); on create response shows raw token in read-only input with one-click copy button and prominent warning "Copy this token now — it won't be shown again"; "I've copied it" button closes dialog; no dismissal without acknowledgement
- [ ] T036 [US4] Implement Tokens settings page at `apps/web/src/app/(app)/settings/tokens/page.tsx` — renders `TokenList`; "Generate new token" button (disabled with tooltip "Maximum 5 tokens — revoke one first" when at limit) opens `CreateTokenDialog`
- [ ] T037 [P] [US4] Add `useTokens`, `useCreateToken`, `useRevokeToken` hooks to `apps/web/src/lib/queries/tokens.ts` — `useCreateToken` mutation caches raw token value in local React state only (never persisted); invalidates token list on create/revoke

**Checkpoint**: Full token lifecycle functional end-to-end: generate → use in API call → revoke → API call rejected. 5-token limit enforced. US4 testable independently.

---

## Phase 7: User Story 5 — Close / Delete Own Account (Priority: P3)

**Goal**: Users can permanently delete their own account with password confirmation. PII is
replaced with "Former member" while CRM records remain intact. The last Admin in a tenant
is blocked from deletion.

**Independent Test**: Sign in as non-last-Admin user → Settings → Security → Danger Zone →
Delete account → enter correct password → confirm. Verify redirect to /login, sign-in
rejected. Verify contacts owned by deleted user show "Former member" as owner. Verify last
Admin cannot proceed — blocked with correct error message.

### Backend — User Story 5

- [ ] T038 [P] [US5] Implement `AccountDeletionService` in `apps/api/src/main/java/io/opsnext/api/deletion/AccountDeletionService.java`:
  - Verify supplied password against user's current bcrypt hash (reject: 401 `CURRENT_PASSWORD_INCORRECT`)
  - Count active Admin users in tenant (reject: 403 `LAST_ADMIN_CANNOT_DELETE` if count = 1 and user is Admin)
  - Anonymise user: set firstName="Former", lastName="member", email=`deleted_{userId}@deleted`, avatarUrl=null, isDeleted=true
  - Revoke all active sessions: add all JWT JTIs to Redis deny-list
  - Revoke all personal API tokens: set revokedAt on all active tokens, add hashes to Redis deny-list
  - Emit `ACCOUNT_DELETED` structured audit log
- [ ] T039 [US5] Implement `AccountDeletionController` in `apps/api/src/main/java/io/opsnext/api/deletion/AccountDeletionController.java`:
  - `DELETE /api/v1/account` (body: `{ password }`) → 204 on success; clears session cookie in response; 403 `LAST_ADMIN_CANNOT_DELETE`; 401 `CURRENT_PASSWORD_INCORRECT`

### Frontend — User Story 5

- [ ] T040 [P] [US5] Implement `DeleteAccountDialog` at `apps/web/src/components/settings/delete-account-dialog.tsx` — "This action is permanent and cannot be undone" warning; current password field; "Delete my account" submit button (destructive red); calls `DELETE /api/v1/account`; on success clears account-store and redirects to `/login`; shows `LAST_ADMIN_CANNOT_DELETE` error inline
- [ ] T041 [US5] Add Danger Zone section to `apps/web/src/app/(app)/settings/security/page.tsx` — "Delete my account" button (outlined red) in clearly separated Danger Zone card; opens `DeleteAccountDialog`

**Checkpoint**: Account deletion end-to-end functional. Last-Admin guard blocks correctly. PII anonymised. Former user's CRM records intact with "Former member" attribution. US5 testable independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Settings navigation, API envelope compliance, observability verification, and end-to-end validation.

- [ ] T042 [P] Implement Settings navigation sidebar at `apps/web/src/components/settings/settings-nav.tsx` — links to Profile, Security, Notifications, Tokens pages; highlights active page; visible on all settings sub-pages
- [ ] T043 [P] Implement Settings layout at `apps/web/src/app/(app)/settings/layout.tsx` — renders `settings-nav` alongside `{children}`; consistent page heading and breadcrumb
- [ ] T044 [P] Verify all 11 account API endpoints return `{ data, meta, errors }` response envelope per Constitution Principle II; apply shared `ApiResponse<T>` wrapper in `apps/api/src/main/java/io/opsnext/api/common/ApiResponse.java` where missing
- [ ] T045 Verify `AccountEventLogger` emits all required fields (`tenantId`, `userId`, `operation`, `durationMs`, `outcome`) for every account event type; add any missing fields in `apps/api/src/main/java/io/opsnext/api/account/AccountEventLogger.java`
- [ ] T046 [P] Run end-to-end validation: exercise all quickstart scenarios — profile update, avatar upload/remove, password change, notification preference toggle, token generate + API call + revoke, account delete with last-Admin guard check

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phases 3–7)**: All depend on Phase 2 completion
  - US1 (Edit Profile) and US2 (Change Password) are both P1 and can proceed in parallel after Phase 2
  - US3 (Notification Prefs) and US4 (Personal API Tokens) are P2 — can start in parallel after Phase 2 (no dependency on US1/US2)
  - US5 (Account Deletion) is P3 — can start after Phase 2; depends on sessions/tokens infrastructure from earlier phases being in place
- **Polish (Phase 8)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no story dependencies
- **US2 (P1)**: After Phase 2 — no story dependencies; runs in parallel with US1
- **US3 (P2)**: After Phase 2 — no story dependencies
- **US4 (P2)**: After Phase 2 — `ApiTokenAuthFilter` (T012, Foundational) must be complete
- **US5 (P3)**: After Phase 2 — session revocation reuses Redis deny-list from auth infrastructure; token revocation reuses US4 service methods (T031–T032 should be complete first)

### Parallel Opportunities

- T002, T003, T004, T005, T006 can all run in parallel with T001 (Phase 1)
- T008, T009, T011 can run in parallel with T007 (Phase 2)
- T013, T014 can run in parallel within US1 backend; T016, T017, T019 in parallel within US1 frontend
- US1 backend and US1 frontend can proceed in parallel once entities are ready (T007 complete)
- US1 and US2 full phases can run in parallel (different files, different endpoints)
- US3 and US4 full phases can run in parallel

---

## Parallel Example: User Story 1

```bash
# Backend tasks in parallel (different files, no conflicts):
Task: "Implement AccountService.getProfile/updateProfile in AccountController.java"  # T013
Task: "Implement AccountController GET/PUT /api/v1/account/profile"                  # T014

# Frontend tasks in parallel:
Task: "Implement ProfileForm component in profile-form.tsx"                           # T016
Task: "Implement AvatarUploader component in avatar-uploader.tsx"                    # T017
Task: "Add useProfile, useUpdateProfile hooks in queries/account.ts"                  # T019
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 Edit Profile
4. Complete Phase 4: US2 Change Password
5. **STOP and VALIDATE**: Full settings page with profile edit and password change functional on localhost
6. Present to Product Owner for phase-gate approval

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 + US2 (P1) → core self-service settings (MVP)
3. US3 + US4 (P2) → notification prefs + API token integrations
4. US5 (P3) → account deletion / GDPR self-service
5. Polish → settings nav, observability verification

---

## Notes

- [P] tasks = different files, no dependencies between them
- [USn] label maps task to specific user story for traceability
- Avatar upload uses two-step flow: get pre-signed PUT URL → browser uploads directly to MinIO (avoids proxying binary through API server)
- Token raw value must never appear in logs, DB, or subsequent API responses — enforce this at the `ApiTokenService` layer
- Account deletion anonymisation ("Former member") is PII-scoped only; full tenant data erasure (GDPR bulk delete) is handled by 002-tenant-platform US5
- Last-Admin guard uses `COUNT(*)` of non-deleted users with `role = ADMIN` in the same tenant schema — check atomically before deletion
- Commit after each task or logical group; stop at each checkpoint to validate story independently
