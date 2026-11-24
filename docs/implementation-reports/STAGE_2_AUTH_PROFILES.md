# STAGE 2: AUTHENTICATION & USER PROFILES

## Objectives Completed
- Secure email/password authentication using Supabase Auth:
  - `/register` (unique username verification)
  - `/login` (redirect preservation)
  - `/forgot-password` and `/reset-password`
  - `/auth/callback` (OAuth & email confirmation)
- User Profiles (`profiles` table linked to `auth.users`):
  - Owner-only update security via Row Level Security (RLS)
  - Automatic profile generation trigger on registration (`handle_new_user`)
  - Privilege escalation guard preventing self-granted seller access
- Next.js edge middleware (`src/middleware.ts`) enforcing authenticated access to `/profile` and redirecting authenticated sessions away from `/login`.
