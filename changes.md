
# Project Overhaul: Proctor System Compatibility Check

This document outlines the major changes and deletions made to transform the project into a "Proctor System Compatibility Check" tool.

## I. Folders & Major Files to DELETE:

The following folders and their entire contents should be **deleted** from your project structure. The new implementation does not use them.

- `src/ai/`
- `src/app/(app)/student/`
- `src/app/(app)/teacher/`
- `src/app/exam-session/`
- `src/app/web-ide/`
- `src/components/landing/` (if `three-scene-placeholder.tsx` was its only content, or review other files)
- `src/components/seb/seb-exam-view-client.tsx` (Replaced by new SEB flow)
- `src/components/seb/seb-live-test-client.tsx` (Functionality integrated/simplified elsewhere)
- `src/components/student/`
- `src/components/teacher/`
- `src/components/shared/dashboard-sidebar.tsx` (Dashboards are simpler now)
- `src/components/shared/exam-taking-interface.tsx`
- `src/app/api/log/route.ts` (If it existed for old logging)
- `src/app/api/seb/submit-exam/route.ts`
- `src/app/api/seb/validate-entry-token/route.ts` (If it existed)
- All `.tsx` pages under `src/app/(app)/student/dashboard/` and `src/app/(app)/teacher/dashboard/` like `overview/page.tsx`, `exams/page.tsx`, `ai-assistant/page.tsx`, `profile/page.tsx`, `settings/page.tsx`, `results/page.tsx` etc.
- Any other components specifically tied to the old exam, student, or teacher features.

## II. New Table Structure (SQL):

Delete all existing Supabase tables and create the following new ones:

1.  **`admins` Table:**
    ```sql
    CREATE TABLE admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL, -- Store securely hashed passwords
        created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    ```

2.  **`license_keys` Table:**
    ```sql
    CREATE TABLE license_keys (
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
    CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL, -- Store securely hashed passwords
        saved_links TEXT[] NULL,
        license_key_used_id UUID REFERENCES license_keys(id) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Add foreign key constraint from license_keys to users AFTER users table is created
    ALTER TABLE license_keys
    ADD CONSTRAINT fk_claimed_by_user
    FOREIGN KEY (claimed_by_user_id)
    REFERENCES users(id);
    ```

## III. Summary of Major Code Changes:

- **Global Styles (`globals.css`):** Completely revamped for a new, simpler, professional UI theme. Removed old theme variables and styles.
- **Root Layout (`layout.tsx`):** Updated metadata, simplified structure.
- **Homepage (`page.tsx`):** Now a minimal landing page with Login/Register calls to action. Removed all previous feature sections and branding.
- **Authentication (`AuthContext.tsx`, `auth/page.tsx`, `auth-form.tsx`):**
    - Registration flow now requires a valid, unclaimed license key.
    - User sets username/password after key validation.
    - Separate login/registration logic for `users` and `admins` (admin login might be a future step or simple check).
    - `AuthContext` adapted to new user model (no student/teacher roles).
- **User Dashboard (`app/(app)/user/dashboard/page.tsx` - New):**
    - Placeholder for "Check Compatibility" feature.
    - UI for managing (add/view/remove) `saved_links` stored in the `users` table.
    - "Run SEB" button to initiate SEB flow.
- **Admin Dashboard (`app/(app)/admin/dashboard/page.tsx` - New):**
    - UI for generating new license keys.
    - API endpoint for creating license keys.
- **SEB Integration:**
    - `/api/generate-seb-token`: Simplified to carry minimal user identification.
    - `/api/seb/validate-token`: Validates the user token and fetches their `saved_links`.
    - `components/seb/seb-entry-client-new.tsx`: Displays "Check System Compatibility" message and the user's saved links, each with an "Open" button.
- **Database Types (`types/supabase.ts`):** Updated to reflect the new `users`, `admins`, and `license_keys` tables.
- **Shared Components (`header.tsx`, `footer.tsx`):** Simplified, removed old branding, updated navigation links.
- **Middleware (`middleware.ts`):** Adapted to new authentication logic and dashboard routes (`/user/dashboard`, `/admin/dashboard`).
- **API Routes:** New routes created/modified for:
    - License key validation.
    - User registration with a license key.
    - Admin license key generation.
    - Simplified SEB token handling.

## IV. Branding:

- All instances of "ZenTest", "ProctorPrep", and associated logos have been removed.
- Placeholder names like "ProctorChecker" or "SystemCheck Pro" might be used in UI elements and can be easily changed.

This overhaul aims to create a focused tool as per the new requirements. Remember to handle password hashing securely in a production environment.
