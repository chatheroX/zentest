
# Project Overhaul: Proctor System Compatibility Check (v2)

This document outlines the major changes and deletions made to transform the project into a "Proctor System Compatibility Check" tool. This version includes a hidden admin login and further UI/UX refinements.

## I. Folders & Major Files to DELETE from your previous "ProctorChecker" or "ZenTest" structure:

The following folders and their entire contents should be **deleted** from your project structure. The new implementation does not use them.

*   `src/ai/` (All AI and Genkit related files and folders)
*   `src/app/(app)/student/` (Old student dashboard and related pages/components)
*   `src/app/(app)/teacher/` (Old teacher dashboard and related pages/components)
*   `src/app/exam-session/` (Old exam taking interface)
*   `src/app/web-ide/` (If it existed for coding exams)
*   `src/components/landing/` (If `three-scene-placeholder.tsx` or other old landing page components were its only content)
*   `src/components/seb/seb-exam-view-client.tsx` (Replaced by new SEB flow)
*   `src/components/seb/seb-live-test-client.tsx` (Functionality integrated/simplified elsewhere)
*   `src/components/seb/seb-entry-client.tsx` (The older version of the SEB entry client)
*   `src/components/student/` (Old student-specific components)
*   `src/components/teacher/` (Old teacher-specific components)
*   `src/components/shared/dashboard-sidebar.tsx` (New dashboards are simpler, no complex sidebar needed for now)
*   `src/components/shared/exam-taking-interface.tsx`
*   `src/app/api/log/route.ts` (If it existed for old logging)
*   `src/app/api/seb/submit-exam/route.ts`
*   `src/app/api/seb/validate-entry-token/route.ts` (This was the old SEB token validator; new one is `/api/seb/validate-token`)
*   All `.tsx` pages under old `src/app/(app)/student/dashboard/` and `src/app/(app)/teacher/dashboard/` such as `overview/page.tsx`, `exams/page.tsx`, `ai-assistant/page.tsx`, `profile/page.tsx`, `settings/page.tsx`, `results/page.tsx` etc. (These are replaced by `src/app/(app)/user/dashboard/page.tsx` and `src/app/(app)/admin/dashboard/page.tsx`)
*   `src/app/supabase-test/page.tsx` (Was for testing old `proctorX` table)
*   `src/lib/error-logging.ts` (If it existed and was specific to old features)
*   Any other components, hooks, or utility files specifically tied to the old exam, student, or teacher features that are not being reused.

## II. New Table Structure (SQL):

Ensure all old Supabase tables are deleted. Create the following new ones (these commands are idempotent if run correctly after deleting old tables):

1.  **`admins` Table:**
    ```sql
    CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL, -- Store securely hashed passwords
        created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    ```

2.  **`license_keys` Table:**
    ```sql
    CREATE TABLE IF NOT EXISTS license_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_value TEXT UNIQUE NOT NULL,
        is_claimed BOOLEAN DEFAULT FALSE NOT NULL,
        claimed_at TIMESTAMPTZ NULL,
        claimed_by_user_id UUID NULL, -- Will be updated to reference users.id
        created_by_admin_id UUID REFERENCES admins(id) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    ```

3.  **`users` Table:**
    ```sql
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL, -- Store securely hashed passwords
        saved_links TEXT[] NULL,
        avatar_url TEXT NULL, -- For Dicebear or other avatar URLs
        license_key_used_id UUID REFERENCES license_keys(id) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Add foreign key constraint from license_keys to users AFTER users table is created
    -- This ensures the users table exists before attempting to reference it.
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_claimed_by_user'
        ) THEN
            ALTER TABLE license_keys
            ADD CONSTRAINT fk_claimed_by_user
            FOREIGN KEY (claimed_by_user_id)
            REFERENCES users(id);
        END IF;
    END $$;
    ```

## III. Summary of Major Code Changes (v2):

*   **Global Styles (`globals.css`):** "Aurora" theme (cool blues, teals, soft purple accent) for light and dark modes.
*   **Root Layout (`layout.tsx`):** Updated metadata, simplified structure.
*   **Homepage (`page.tsx`):** Minimal landing page with Login/Register calls to action. Branding "ProctorChecker".
*   **Authentication (`AuthContext.tsx`, `auth/page.tsx`, `auth-form.tsx`, `uradmin/page.tsx`):**
    *   Registration flow requires a valid, unclaimed license key. User sets username/password.
    *   **Main AuthForm (`auth-form.tsx`) now only handles USER login and USER registration.**
    *   **New Admin Login Page (`app/uradmin/page.tsx`):** Dedicated, less discoverable login page for administrators.
    *   `AuthContext` adapted for new user/admin model, separate sign-in functions. Avatars are generated (Dicebear) and stored for users.
*   **User Dashboard (`app/(app)/user/dashboard/page.tsx` - New):**
    *   UI for managing (add/view/remove) `saved_links` stored in the `users` table.
    *   "Run SEB" button to initiate SEB compatibility check flow.
*   **Admin Dashboard (`app/(app)/admin/dashboard/page.tsx` - New):**
    *   UI for generating new license keys.
    *   Table display of all generated license keys, showing `key_value`, `is_claimed` status, `claimed_by_username`, `claimed_at`, `created_at`.
*   **SEB Integration:**
    *   `/api/generate-seb-token`: Simplified, carries user identification. Uses JWT.
    *   `/api/seb/validate-token`: Validates user token, fetches `saved_links` from `users` table and `avatar_url`.
    *   `components/seb/seb-entry-client-new.tsx`: Displays "Check System Compatibility" message, user's saved links (each with an "Open" button), and user avatar/info.
*   **Database Types (`types/supabase.ts`):** Updated to reflect the new `users`, `admins`, and `license_keys` tables, including `avatar_url` for users.
*   **Shared Components (`header.tsx`, `footer.tsx`):**
    *   Simplified, old branding removed, updated navigation links. "ProctorChecker" branding.
    *   **Footer content (copyright, privacy/terms links) removed.**
*   **Middleware (`middleware.ts`):** Adapted to new authentication logic, separate admin login route (`/uradmin`), and dashboard routes (`/user/dashboard`, `/admin/dashboard`).
*   **API Routes:** New/modified routes for license key validation, user registration, admin key generation, simplified SEB token handling.
*   **`package.json`:** Cleaned up to remove AI/Genkit related dependencies (`@genkit-ai/*`, `genkit`, `genkit-cli`) and `paseto`. Genkit scripts removed.
*   **Branding:** All instances of "ZenTest", "ProctorPrep" removed/replaced with "ProctorChecker". Privacy and Terms pages updated to "ProctorChecker".

This overhaul aims to create a focused "Proctor System Compatibility Check" tool as per the new requirements. Remember to handle password hashing securely in a production environment.
