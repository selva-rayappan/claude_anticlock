# Feature Specification: Authentication & Authorisation

**Feature Branch**: `003-auth-authz`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Authentication & Authorisation" — derived from
`specs/ops-crm-functional-requirements.md` section 4.2.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Sign In & Sign Out (Priority: P1)

A registered user signs in to Ops with their email address and password. After a
successful login they are taken to their dashboard. When they sign out, their session
is immediately invalidated and they cannot access protected pages until they sign in again.

**Why this priority**: Without secure sign-in there is no application. All other features
depend on knowing who the user is and which tenant they belong to.

**Independent Test**: Open the app, enter valid credentials, verify the dashboard loads.
Sign out and verify the login page is shown; direct navigation to `/dashboard` must
redirect back to login. Fully testable with a single user account and no other feature.

**Acceptance Scenarios**:

1. **Given** a registered user with valid credentials, **When** they submit the login
   form, **Then** they are redirected to their dashboard and the session is active.
2. **Given** a user enters an incorrect password, **When** they submit the form,
   **Then** an error is shown ("Invalid email or password") and no session is created.
3. **Given** a signed-in user clicks "Sign out", **When** confirmed, **Then** their
   session is immediately invalidated and any protected page redirects to login.
4. **Given** a session that has been inactive beyond the timeout period, **When** the
   user tries to perform an action, **Then** they are prompted to sign in again without
   losing their current page context.

---

### User Story 2 — Password Reset (Priority: P1)

A user who has forgotten their password can request a reset link from the login page.
They receive an email with a time-limited link; following it lets them set a new password.

**Why this priority**: Locked-out users cannot use the product. A self-service reset
path reduces support cost and is a baseline expectation for any SaaS application.

**Independent Test**: Click "Forgot password", enter a registered email, receive the
reset email, follow the link, set a new password, and sign in with it. The old password
must be rejected after the reset.

**Acceptance Scenarios**:

1. **Given** a user submits their email on the "Forgot password" page, **When** the
   email is registered, **Then** a reset email is sent and a neutral confirmation message
   is shown (same message whether or not the email exists — no user enumeration).
2. **Given** a valid reset link, **When** the user sets a new password meeting complexity
   rules, **Then** the password is updated and the user can sign in immediately.
3. **Given** a reset link older than 24 hours, **When** followed, **Then** it is
   rejected with a clear message to request a new one.
4. **Given** a reset link already used once, **When** followed again, **Then** it is
   rejected as already consumed.

---

### User Story 3 — Role-Based Access Control (Priority: P1)

A Tenant Admin assigns one of four roles to each user in their organisation. The system
enforces those roles on every action: read-only users cannot modify records, sales reps
cannot manage users, and managers cannot change tenant-wide settings.

**Why this priority**: Without access control, every user can do everything — a critical
security and compliance failure for a multi-tenant CRM product.

**Independent Test**: Create one user per role (Admin, Manager, Rep, Read-Only). Log in
as each and verify: Read-Only cannot create a contact; Rep cannot invite users; Manager
cannot change tenant settings. Testable without any other CRM feature.

**Acceptance Scenarios**:

1. **Given** a Tenant Admin opens the Users page, **When** they assign the "Sales Rep"
   role to a user, **Then** that user can create and edit contacts but cannot invite new
   users or change tenant settings.
2. **Given** a Read-Only user is signed in, **When** they attempt to create, edit, or
   delete any record, **Then** the action is blocked and an informative message is shown.
3. **Given** a Sales Manager, **When** they view deals and contacts, **Then** they can
   see and edit all records across the tenant, not just their own.
4. **Given** a Sales Rep, **When** they navigate to user management or tenant settings,
   **Then** they are redirected with an "Insufficient permissions" message.
5. **Given** a Tenant Admin attempts to remove the last Admin role from the tenant,
   **When** confirmed, **Then** the action is blocked with a clear error message.

---

### User Story 4 — Account Lockout After Failed Attempts (Priority: P2)

After five consecutive failed sign-in attempts within a ten-minute window, a user account
is temporarily locked. The lockout is communicated clearly and resolves automatically,
or can be cleared early by a Tenant Admin.

**Why this priority**: Prevents brute-force password attacks — a baseline security
control required for commercial SaaS products.

**Independent Test**: Submit five incorrect passwords for one account within ten minutes.
Verify the sixth attempt (correct or incorrect) is blocked with a lockout message. Verify
a Tenant Admin can unlock the account from the Users page.

**Acceptance Scenarios**:

1. **Given** five consecutive failed sign-in attempts within 10 minutes for one account,
   **When** a sixth attempt is made, **Then** the account is locked and the user sees a
   message indicating the lockout duration.
2. **Given** a locked account, **When** a Tenant Admin unlocks it from the Users page,
   **Then** the user can sign in immediately.
3. **Given** a locked account with no admin intervention, **When** 30 minutes have elapsed,
   **Then** the account unlocks automatically and sign-in is permitted.

---

### User Story 5 — Multi-Factor Authentication (Priority: P3)

A user can optionally enable time-based one-time password (TOTP) two-factor
authentication from their security settings. Once enabled, every sign-in requires
both the correct password and a valid TOTP code from their authenticator app.

**Why this priority**: MFA provides significant security uplift for accounts with
sensitive CRM data access, but is optional and not required for initial launch.

**Independent Test**: Enable MFA on a test account using an authenticator app. Sign out
and sign back in — verify the TOTP step appears and that an invalid code is rejected.
Verify a backup recovery code allows access when TOTP is unavailable.

**Acceptance Scenarios**:

1. **Given** a signed-in user enables MFA from Security Settings and scans the QR code,
   **When** they confirm with a valid TOTP code, **Then** MFA is active and all future
   sign-ins will require a code.
2. **Given** a user with MFA enabled enters correct credentials, **When** prompted for
   their code, **Then** a valid current code grants access; an invalid code is rejected
   with up to 3 retry attempts.
3. **Given** a user has lost their authenticator app, **When** they enter a one-time
   backup recovery code, **Then** they are signed in and prompted to reconfigure MFA.

---

### Edge Cases

- What happens if a user signs in to a suspended tenant? → They receive a message that
  the account is suspended; no session is created and no specific error reason is given
  beyond "access unavailable".
- What if the same user is signed in on two devices simultaneously? → Both sessions
  remain valid. Sign-out on one device does not affect the other unless the user
  chooses "Sign out of all devices".
- What if a Tenant Admin changes a user's role while they are signed in? → The new role
  takes effect on the next request; no forced sign-out is required.
- What if a password reset is requested for an unregistered email? → The same neutral
  confirmation message is shown; no email is sent; no information is leaked.
- What if a user's account is locked and they request a password reset? → The reset
  flow proceeds normally; successfully resetting the password also clears the lockout.

---

## Requirements *(mandatory)*

### Functional Requirements

**Core Authentication (P1 — User Stories 1 & 2)**
- **FR-AUTH-001**: Users MUST be able to sign in using their registered email address
  and password; failed sign-in MUST NOT reveal whether the email address is registered.
- **FR-AUTH-002**: A successful sign-in MUST establish a session persisting for at least
  8 hours of user activity, automatically renewed on user interaction.
- **FR-AUTH-003**: Signing out MUST immediately and completely invalidate the current
  session; any subsequent request using that session MUST be rejected.
- **FR-AUTH-004**: Every protected page and API endpoint MUST require an active session;
  unauthenticated access MUST redirect to the sign-in page or return an auth error.
- **FR-AUTH-005**: Users MUST be able to request a password reset using their email
  address from the sign-in page.
- **FR-AUTH-006**: Password reset links MUST expire after 24 hours and be invalidated
  after first use.
- **FR-AUTH-007**: All password reset response messages MUST be identical whether or
  not the email address is registered (no user enumeration).
- **FR-AUTH-008**: New passwords MUST meet minimum complexity: at least 8 characters
  including at least one uppercase letter, one lowercase letter, and one number.

**Role-Based Access Control (P1 — User Story 3)**
- **FR-AUTH-009**: Tenant Admin MUST be able to assign each user one of four roles:
  Admin, Sales Manager, Sales Rep, Read-Only.
- **FR-AUTH-010**: The system MUST enforce the following role permissions on every request:
  - **Read-Only**: view-only; no create, update, or delete on any record.
  - **Sales Rep**: create and manage own contacts and deals; cannot manage users or settings.
  - **Sales Manager**: full access to all contacts and deals in the tenant; cannot change
    tenant settings or manage users.
  - **Admin**: full access including user management and tenant settings.
- **FR-AUTH-011**: At least one Admin MUST exist per tenant at all times; removing the
  last Admin MUST be blocked with an explicit error.

**Account Lockout (P2 — User Story 4)**
- **FR-AUTH-012**: After 5 consecutive failed sign-in attempts within a 10-minute window
  for one account, that account MUST be locked for 30 minutes.
- **FR-AUTH-013**: Tenant Admin MUST be able to manually unlock a locked account from
  the user management page.

**Multi-Factor Authentication (P3 — User Story 5)**
- **FR-AUTH-014**: Users MUST be able to optionally enable TOTP-based MFA from their
  Security Settings; enabling MUST require completing a QR-code scan and confirming one
  valid TOTP code before activation is finalised.
- **FR-AUTH-015**: When MFA is enabled, sign-in MUST prompt for a TOTP code after a
  valid password; up to 3 invalid code attempts are allowed before re-prompting the
  password step.
- **FR-AUTH-016**: At MFA setup, the system MUST generate a set of single-use recovery
  codes; each code MUST be usable exactly once to bypass TOTP.

### Key Entities

- **User**: Registered individual. Fields: id, tenantId, email (unique per tenant),
  hashedPassword, role (Admin | Sales Manager | Sales Rep | Read-Only), isLocked,
  failedAttemptCount, lockExpiresAt, mfaEnabled, lastSignedInAt, createdAt.
- **Session**: Active authenticated context. Fields: id, userId, tenantId, issuedAt,
  expiresAt, revokedAt (null if active), deviceHint.
- **PasswordResetToken**: One-time-use reset credential. Fields: id, userId, tokenHash,
  expiresAt, usedAt.
- **MfaConfig**: Per-user MFA configuration. Fields: userId, otpSecretEncrypted,
  recoveryCodes (hashed list), enabledAt.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete the sign-in flow (enter credentials → reach dashboard)
  in under 5 seconds on a standard internet connection.
- **SC-002**: A user can complete the forgotten-password flow (request → receive email
  → set new password → sign in) in under 3 minutes.
- **SC-003**: Role permission enforcement is verified for all four roles with zero
  permission bypasses — confirmed by a manual boundary-test checklist.
- **SC-004**: Account lockout triggers after exactly 5 failed attempts with no false
  positives from interspersed valid sign-ins.
- **SC-005**: Session invalidation on sign-out takes effect within 1 second; any
  subsequent request using the old session is rejected with an authentication error.
- **SC-006**: Zero user-enumeration vectors exist across all authentication flows
  (login failure, password reset, registration) — confirmed by security review.

---

## Assumptions

- User registration (creating the initial Tenant Admin) is handled during tenant
  provisioning, covered in the Tenant & Platform Management spec, not here.
- "Sign out of all devices" (global session revocation) is a P2 enhancement; this
  spec covers single-session sign-out for the MVP.
- Password complexity rules apply to user-set passwords only; Tenant Admin-generated
  temporary passwords force a password change on first login (complexity not enforced
  at generation time).
- TOTP MFA (User Story 5) is individual opt-in; Tenant Admin-mandated MFA for all
  users is out of scope and deferred to a future phase.
- SSO via SAML 2.0 or OIDC for Enterprise tenants is explicitly out of scope for this
  specification and deferred to Phase 3.
- Email delivery for password reset depends on the platform's configured transactional
  email service; delivery timing SLA is the email provider's responsibility.
- The lockout parameters (5 attempts, 10-minute window, 30-minute duration) and session
  timeout (8 hours) are defaults; Platform Admin can adjust them per tenant tier.
- The application is web-only; mobile app authentication is out of scope for this phase.
