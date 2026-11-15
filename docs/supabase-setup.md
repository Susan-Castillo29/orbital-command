# Supabase setup for accounts and shared mission planning

ORBITAL COMMAND remains a GitHub Pages site. Supabase provides authentication and PostgreSQL storage. The browser uses the project URL and **publishable** key (or the legacy `anon` key). These values are public in the built website. Never place a `service_role`, secret key, database password or personal access token in the site, GitHub source or browser configuration. Row-level security and the migration below enforce access.

## Required project details

1. Create or open a Supabase project. Obtain its HTTPS project URL (`https://<project-ref>.supabase.co`) and its publishable key from the project API keys page.
2. In Supabase Authentication, enable email/password sign-in and configure email confirmation and delivery for your users. Add the deployed site URL `https://susan-castillo29.github.io/orbital-command/` to the permitted redirect URLs. For local development also permit the exact local URL used by Vite.
3. In the project's SQL Editor, review and run the entire file [`supabase/migrations/202611150001_collaboration.sql`](../supabase/migrations/202611150001_collaboration.sql) once against the intended project. It creates project-prefixed tables, policies and functions in one transaction; it must not be run again against an already-migrated schema. Back up an existing project before applying a migration. No NASA key is needed for this migration.
4. In the GitHub repository's Actions secrets, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the project URL and **publishable/anon** key. They are passed to the build and will appear in the client bundle, as required by Supabase's browser architecture. They are not substitutes for RLS. Trigger the Pages workflow again after setting secrets.
5. For local development only, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Restart Vite. The URL must be an HTTPS `<project-ref>.supabase.co` origin; invalid, secret or service-role keys are rejected by the build.

The backend must permit browser requests from the deployed site and the chosen local origin. Supabase's redirect configuration and email rate limits must be checked in the actual project. The project URL and publishable key alone cannot apply migrations or grant administrative access.

## What works

- Email/password registration and sign-in use Supabase Auth. Registration may require email confirmation; actual delivery depends on the project's Auth configuration.
- Sessions are kept in memory for the open tab. Reloading or restoring a backup requires signing in again. This avoids writing the session token to local storage; it does not eliminate the need for XSS prevention.
- A signed-in user can save or restore a private campaign backup. Optional automatic backup runs while the tab remains open after the user explicitly enables it; conflicts disable automatic saving instead of silently overwriting a newer version. Browser storage limits and network failures are reported. The copy includes whitelisted mission progress, designs, resources, scans, reports and related campaign data, not passwords, access tokens, audio settings or the optional local learning assessment.
- A user can create a team, privately share an invitation, join a team, select a responsibility, leave a team and, if owner, rotate invitations or delete the team. Teams admit at most four accounts. Invitation codes are bearer secrets: share them privately and rotate them when needed.
- Team members can share a saved mission design, load it into the existing engineering screen, and share or restore a campaign snapshot in turns. Revision checks reject simultaneous stale writes. The UI refreshes team data approximately every five seconds. Restoring a team campaign replaces this device's local mission data after confirmation.

This is **shared planning and turn-based campaign exchange**, not yet synchronised real-time 3D flight, team voice chat, competitive matchmaking or leaderboards. The individual simulator still runs locally; cloud backup is not a server-authoritative anti-cheat system. Personal and team backups are distinct; sharing a campaign exposes its included mission data to all members of that team. Do not use real personal or confidential information as mission data.

## Validation

- `npm test` tests configuration, backup filtering and existing mission systems without production credentials.
- `npm run build` validates the static site. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` may be omitted, in which case the Teams screen reports that the service is not configured.
- `tests/supabase-rls.sql` tests team privacy, invitation rotation, four-member limit, revision conflicts and campaign isolation. It was run against disposable PostgreSQL with a mocked `auth.uid()`; it is not a substitute for a test against the actual Supabase project.
- `tests/browser-collaboration.cjs` exercises two browser contexts using a mocked Supabase service. Start Vite with `VITE_SUPABASE_URL=https://orbitaltest.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test npm run dev -- --host 127.0.0.1 --port 4190 --strictPort`, then run `node tests/browser-collaboration.cjs`. The mock does not connect to a real account.
- Before inviting real users, test confirmation emails, two real accounts, the four-person limit, private backups, role changes, stale-write conflicts, revocation, restoration, cross-device behaviour, rate limits and RLS in the actual project. Review storage, backups, retention, account recovery and security monitoring for the expected deployment.
