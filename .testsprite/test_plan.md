# TestSprite Test Suite Specification: Security & Workspace Management

## Project Information

- **Application:** NovaStore ERP / NovaInvestigator
- **Stack:** Next.js 16 (App Router), React 19, Supabase Auth & Postgres, Supabase Storage
- **Base URL:** `http://localhost:4101` (or `http://10.2.0.2:4101`)

---

## Target Test Scenarios

### Scenario 1: Two-Factor Authentication (2FA / TOTP)

1. **Navigation:** Go to `/pages/user-settings?setting=security`.
2. **Action:** Click on "Enable Two-Factor Authentication".
3. **Expectation:**
   - Server returns factor ID, secret key, and valid QR code image (`POST /api/auth/mfa/enroll`).
   - Entering the 6-digit TOTP verification code enables 2FA.
   - Status badge updates to "Enabled / Activo" and displays recovery backup codes.

### Scenario 2: Change Password & Security

1. **Navigation:** Go to `/pages/user-settings?setting=security` (Email & Password section).
2. **Action:** Click "Unlock Password Fields".
3. **Expectation:**
   - Entering current password and a compliant new password (>= 12 chars, upper, lower, number, special char).
   - Dynamic strength indicator reflects security score.
   - Clicking "Enviar correo de verificación para cambio de contraseña" calls `POST /api/auth/change-password` and redirects to `/pages/auth/verify-email`.

### Scenario 3: Workspace Name, Details & Logo Persistence

1. **Navigation:** Go to `/pages/user-settings?setting=workspace`.
2. **Action:**
   - Modify Workspace Name and Timezone, click "Save Changes".
   - Upload a workspace logo (PNG/JPG <= 500 KB) via `POST /api/workspace/avatar`.
   - Update Workspace Slug and Description, click "Save Changes".
3. **Expectation:**
   - Success toast appears.
   - Storage file exists in Supabase bucket `avatars/workspaces/{id}/logo.png`.
   - Database row in `public.workspaces` persists `name`, `timezone`, `slug`, `description`, `avatar_url`.
   - Hard refresh (`F5`) keeps all values and logo preview populated from the database.

### Scenario 4: Create Team in Workspace

1. **Action:** Call `POST /api/teams` with `{ name: "Equipo Estratégico", description: "Equipo de análisis DAFO/CAME" }`.
2. **Expectation:**
   - Team is created in `public.teams` associated with current `tenant_id` and `workspace_id`.
   - Current user is added as admin in `public.team_members`.
   - Uploading team logo (< 500 KB) persists `avatar_url` in `public.teams`.
   - Teams tab in user profile (`/pages/user-profile?view=teams`) renders the team card with member counts.
