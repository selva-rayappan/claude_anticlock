# Feature Specification: Account Management

**Feature Branch**: `004-account-mgmt`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Account Management" — covers user self-service for
profile, password, notification preferences, and personal API tokens within OpsNext CRM.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Edit Profile (Priority: P1)

A signed-in user can update their own display name, job title, and profile avatar from
their Account Settings page. Changes take effect immediately and are reflected across
the application (e.g., in activity feeds, the topbar, and shared views).

**Why this priority**: A user who cannot correct their own name or avatar has a degraded
experience. Profile completeness also improves team collaboration features.

**Independent Test**: Sign in, navigate to Account Settings, update the display name and
upload an avatar image. Navigate to the contacts list and verify the topbar and any
attributed activities reflect the new name and avatar. No other feature needed.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they update their first name, last name, and job
   title and save, **Then** the new values are displayed immediately in the topbar and on
   all pages that show the user's name.
2. **Given** a user uploads a profile avatar (PNG or JPG, max 2 MB), **When** saved,
   **Then** the avatar is displayed in the topbar and replaces the initials fallback.
3. **Given** a user uploads a file that is not an image or exceeds 2 MB, **When**
   attempting to save, **Then** an inline error message is shown and the old avatar is
   retained.
4. **Given** a user clears their avatar, **When** saved, **Then** the initials fallback
   is displayed instead.

---

### User Story 2 — Change Password (Priority: P1)

A signed-in user can change their own password from the Account Settings security
section by providing their current password and a new password that meets complexity
rules. The change takes effect on the next sign-in (existing session remains valid).

**Why this priority**: Users who receive a temporary password at onboarding, or who want
to rotate credentials regularly, need a self-service path that does not require admin
intervention.

**Independent Test**: Sign in, navigate to Security Settings, enter current and new
password, save. Sign out and sign in with the new password — verify success. Attempt
sign-in with the old password — verify rejection.

**Acceptance Scenarios**:

1. **Given** a signed-in user provides their correct current password and a valid new
   password, **When** they submit, **Then** the password is updated and a confirmation
   message is shown; the current session remains active.
2. **Given** a user provides an incorrect current password, **When** they submit,
   **Then** the change is rejected with "Current password is incorrect" and no update
   is made.
3. **Given** a user's new password does not meet complexity rules (min 8 characters,
   one uppercase, one lowercase, one number), **When** they submit, **Then** an inline
   error describes the unmet rule; the password is not changed.
4. **Given** a user submits a new password identical to their current password,
   **When** submitted, **Then** the change is rejected with "New password must differ
   from your current password."

---

### User Story 3 — Notification Preferences (Priority: P2)

A signed-in user can configure which notification types they receive and via which
channels (in-app and/or email). Changes take effect immediately for all subsequent
notifications.

**Why this priority**: Notification fatigue causes users to ignore important alerts.
Fine-grained control over notification channels drives engagement without overwhelming
users, and is a common expectation in SaaS products.

**Independent Test**: Disable email notifications for "Task reminders". Trigger a task
reminder (set a task due today). Verify no email is sent but the in-app notification
still appears. Re-enable and verify both channels fire.

**Acceptance Scenarios**:

1. **Given** a user disables email notifications for "Task reminders", **When** a task
   reminder event fires, **Then** no email is sent for that user but the in-app
   notification still appears.
2. **Given** a user disables in-app notifications for "Deal stage changes", **When** a
   deal moves stage, **Then** no in-app notification is created for that user.
3. **Given** a user disables all notifications for a category, **When** the relevant
   event fires, **Then** neither channel sends a notification for that user.
4. **Given** a user updates their notification preferences, **When** saved, **Then** the
   changes take effect within 30 seconds for all subsequent events.

---

### User Story 4 — Personal API Tokens (Priority: P2)

A signed-in user can generate named personal API tokens to authenticate third-party
tools and scripts against the Ops API on their behalf. Tokens are displayed once at
creation and can be revoked at any time.

**Why this priority**: Power users and developers need a way to integrate Ops with
external tools (Excel macros, scripts, PowerApps) without sharing their login credentials
or exposing the main session cookie.

**Independent Test**: Generate a personal API token named "Excel Integration". Copy the
token value (shown once). Make an API call using `Authorization: Bearer <token>` and
verify the response is the user's data scoped to their tenant. Revoke the token and
verify the same API call now returns 401.

**Acceptance Scenarios**:

1. **Given** a user creates a personal API token with the name "My Script", **When**
   created, **Then** the raw token value is displayed exactly once with instructions to
   copy it; subsequent visits show only the token name and creation date.
2. **Given** a valid personal API token is used in an API request, **When** the request
   is processed, **Then** it is treated as the owning user's identity and their tenant's
   data is accessible per their assigned role.
3. **Given** a user revokes a personal API token, **When** the same token is used in a
   subsequent API request, **Then** the request is rejected with an authentication error.
4. **Given** a user has 5 active tokens and attempts to create a 6th, **When** submitted,
   **Then** the creation is blocked with a message indicating the maximum limit and
   offering to revoke an existing token.

---

### User Story 5 — Close / Delete Own Account (Priority: P3)

A user can request permanent deletion of their own account. The request requires password
confirmation and removes personal identifiers while preserving CRM records (contacts,
deals) attributed to that user under a "Former member" placeholder.

**Why this priority**: GDPR right-to-erasure applies to personal data. Users who leave an
organisation need to know their personal information can be removed without destroying
the company's CRM history.

**Independent Test**: Sign in, request account deletion, confirm with password. Verify the
user can no longer sign in. Verify contacts they created still exist but show "Former
member" as the owner. Verify their name no longer appears in any shared view.

**Acceptance Scenarios**:

1. **Given** a user confirms account deletion with their current password, **When**
   processed, **Then** their account is deactivated and their PII (name, email, avatar)
   is replaced with "Former member"; their session is immediately terminated.
2. **Given** a deleted user's former contacts and deals, **When** viewed by other team
   members, **Then** those records still exist and show "Former member" as the owner
   with no broken references.
3. **Given** the last Admin user in a tenant attempts to delete their own account,
   **When** confirmed, **Then** the deletion is blocked with a message: "You are the only
   Admin — assign another Admin before deleting your account."
4. **Given** a deletion request is made with an incorrect password, **When** submitted,
   **Then** the deletion is rejected and the account remains active.

---

### Edge Cases

- What if a user changes their email address? → Email change is a separate security-
  sensitive flow (requires verification of the new address) and is out of scope for this
  phase; the email field is read-only in Account Settings.
- What if two users update their profile simultaneously? → Last write wins; no
  concurrent-edit conflict is expected for personal profile data.
- What if a user's avatar upload is interrupted mid-transfer? → The previous avatar is
  retained; the partial upload is discarded; the user sees an upload error.
- What if a personal API token is used from an IP address that was never used before? →
  No IP restriction is applied in Phase 1; token authentication succeeds if the token is
  valid and un-revoked.
- What if a Tenant Admin deactivates a user who has active personal API tokens? → All
  personal API tokens for that user are automatically revoked as part of account
  deactivation (covered in 003-auth-authz).

---

## Requirements *(mandatory)*

### Functional Requirements

**Profile Management (P1 — User Story 1)**
- **FR-ACM-001**: A signed-in user MUST be able to update their first name, last name,
  and job title from their Account Settings page.
- **FR-ACM-002**: A signed-in user MUST be able to upload a profile avatar image (PNG
  or JPG format, maximum 2 MB); the avatar MUST replace the initials fallback throughout
  the application.
- **FR-ACM-003**: A signed-in user MUST be able to remove their avatar; the initials
  fallback MUST be restored immediately.
- **FR-ACM-004**: Profile changes MUST take effect immediately across all views that
  display the user's name or avatar without requiring a page refresh.

**Password Change (P1 — User Story 2)**
- **FR-ACM-005**: A signed-in user MUST be able to change their own password by
  providing their current password and a new password meeting complexity rules.
- **FR-ACM-006**: The system MUST reject the change if the current password is incorrect,
  returning a specific "current password incorrect" error.
- **FR-ACM-007**: The new password MUST meet the same complexity rules as registration:
  at least 8 characters, one uppercase letter, one lowercase letter, one number.
- **FR-ACM-008**: The system MUST reject a new password identical to the current password.
- **FR-ACM-009**: A successful password change MUST NOT invalidate the current session.

**Notification Preferences (P2 — User Story 3)**
- **FR-ACM-010**: A signed-in user MUST be able to independently toggle in-app and email
  channels for each notification category: Task Reminders, Deal Stage Changes, Contact
  Assignments, @Mentions in Notes, Weekly Summary.
- **FR-ACM-011**: Preference changes MUST take effect within 30 seconds for all subsequent
  notification events without requiring a sign-out.

**Personal API Tokens (P2 — User Story 4)**
- **FR-ACM-012**: A signed-in user MUST be able to generate a named personal API token;
  the raw token value MUST be displayed exactly once at creation and never again.
- **FR-ACM-013**: Personal API tokens MUST authenticate API requests with the owning
  user's identity and role, scoped to their tenant.
- **FR-ACM-014**: A signed-in user MUST be able to revoke any of their personal API
  tokens; revocation MUST take effect immediately.
- **FR-ACM-015**: Each user MUST be limited to a maximum of 5 active personal API tokens.

**Account Deletion (P3 — User Story 5)**
- **FR-ACM-016**: A signed-in user MUST be able to request permanent deletion of their
  own account, confirmed with their current password.
- **FR-ACM-017**: Account deletion MUST replace personal identifiers (name, email,
  avatar) with "Former member" while retaining all CRM records (contacts, deals,
  activities) previously attributed to that user.
- **FR-ACM-018**: Account deletion MUST be blocked if the user is the last Admin in
  their tenant, with a clear message directing them to assign another Admin first.
- **FR-ACM-019**: Account deletion MUST immediately terminate all active sessions and
  revoke all personal API tokens for that user.

### Key Entities

- **UserProfile**: Personal details editable by the user. Fields: userId, firstName,
  lastName, jobTitle, avatarUrl, updatedAt.
- **NotificationPreference**: Per-user, per-category channel preferences. Fields: userId,
  category (TASK_REMINDER | DEAL_STAGE_CHANGE | CONTACT_ASSIGNMENT | MENTION |
  WEEKLY_SUMMARY), inAppEnabled, emailEnabled.
- **PersonalApiToken**: User-issued API credential. Fields: id, userId, tenantId, name,
  tokenHash (stored; raw value shown once), createdAt, lastUsedAt, revokedAt.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can update their profile (name + avatar) and see changes reflected
  across the application in under 3 seconds.
- **SC-002**: A password change from the settings page completes in under 5 seconds with
  immediate on-screen confirmation.
- **SC-003**: Notification preference changes take effect within 30 seconds — verified
  by triggering a notification event immediately after saving a preference change.
- **SC-004**: A personal API token is generated, copied, used in an API call, and
  revoked within a single 2-minute test session.
- **SC-005**: Account deletion removes all personal identifiers within 60 seconds, with
  zero broken record references remaining in the CRM.
- **SC-006**: All Account Management pages are accessible and fully functional within
  2 seconds of navigation on a standard internet connection.

---

## Assumptions

- Email address change is explicitly out of scope for this phase; it requires a separate
  verification flow and is deferred to a future phase.
- Avatar images are stored in the platform's object storage (same as data exports) and
  served via a CDN-friendly URL; the spec does not mandate a specific storage provider.
- The 5-token limit per user is a platform-wide default; Platform Admins may adjust it
  per tier in a future phase.
- Notification categories in scope for Phase 1: Task Reminders, Deal Stage Changes,
  Contact Assignments, @Mentions in Notes, Weekly Summary. Additional categories from
  future features (e.g., pipeline triggers) will extend this list in later phases.
- "Former member" anonymisation is sufficient for GDPR compliance for the CRM records
  context; full GDPR data subject erasure requests are handled by the Platform Admin
  export/delete flow (002-tenant-platform, US5).
- A user's personal API tokens authenticate with the same role and tenant scope as the
  user's interactive session; there is no way to grant a token more permissions than the
  user holds.
- The Account Settings page is accessible to users of all roles (Admin, Manager, Rep,
  Read-Only) for their own profile; no role can view or edit another user's account
  settings through this feature.
