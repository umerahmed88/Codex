# Phase 2 — Backend Setup Guide (the manual steps only you can do)

The code is written. To make it *run*, you need a Supabase project and a couple
of values pasted into a local env file. Follow these in order.

## 1. Create a Supabase project (~3 min)

1. Go to https://supabase.com and sign up (free tier is fine to start).
2. Click **New project**. Give it a name (e.g. `arabic-app`), pick a region
   close to your users (for the Gulf, choose the nearest available, e.g.
   Frankfurt or Mumbai), and set a database password (save it somewhere safe).
3. Wait ~2 minutes while it provisions.

## 2. Create the database tables

1. In your project, open the **SQL Editor** (left sidebar).
2. Open `supabase/migrations/0001_initial_schema.sql` from this repo, copy its
   contents, paste into the editor, and click **Run**.
3. Do the same with `supabase/migrations/0002_rls_policies.sql`.
4. Do the same with `supabase/seed.sql` (this adds the sample track + 7 lessons).

> Later, when you install the Supabase CLI, you can run all of these with
> `supabase db push` and `supabase db reset` instead of copy-paste.

## 3. Get your API keys and put them in `.env.local`

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
3. In this repo, copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

> The **anon key** is safe to ship in a mobile app — it only grants what the
> Row-Level Security policies allow. Never put the **service_role** key in the
> app; that one bypasses all security and belongs only on a trusted server.

## 4. Run the app

```bash
npm install
npm start
```
Then open it in Expo Go (scan the QR) or an emulator.

## 5. Verify (the Phase 2 checklist)

- [ ] Register a new user, then close and reopen the app → still logged in.
- [ ] Log out from Profile → returns to the login screen.
- [ ] Log back in → lands in the app.
- [ ] The seeded track + 7 lessons are fetchable (they'll render in Phase 3).
- [ ] A user cannot read another user's progress (RLS enforces this).

## Still to configure later (not required to run today)

- **Sign in with Apple / Google:** these need developer-console setup
  (Apple Developer Program, Google OAuth credentials) and Supabase provider
  config under **Authentication → Providers**. The app's `AuthProvider` is
  structured to add these methods once those accounts exist — we'll wire them
  in when you're ready to prepare for store submission (Apple *requires* "Sign
  in with Apple" if you offer any other social login).
- **Email confirmation:** by default Supabase emails a confirmation link on
  signup. For faster local testing you can disable it under
  **Authentication → Providers → Email → "Confirm email"**.
