# Phase 15 — Growth layer (analytics, remote push, social login)

Three growth features, each shipped as working code that **stays silent until
you configure it** — the app never depends on any of these to run.

---

## 1. PostHog analytics

Every event already goes to Sentry as a breadcrumb; Phase 15 dual-writes the
same typed events to PostHog for funnels and retention (`src/lib/analytics.ts`
→ `src/lib/posthog.ts`).

### Setup

1. Create a project at https://posthog.com (EU cloud recommended for the
   target market's data-residency story).
2. Add to `.env.local`:
   ```
   EXPO_PUBLIC_POSTHOG_KEY=phc_...
   EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com   # optional; EU is the default
   ```
3. That's it — leave the key unset and `track()` simply skips PostHog.

### Privacy (PDPL / GDPR)

- We `identify()` users by their **opaque Supabase user id only** — never
  email, name, or contacts. `reset()` runs on logout so a shared device never
  cross-labels users.
- Event properties are the closed set in `AnalyticsEvent`; no free-form PII.
- Disclose analytics in your Privacy Policy and offer opt-out if your
  jurisdiction (e.g. Saudi PDPL) requires it.

---

## 2. Remote push notifications

Local daily reminders (`src/lib/notifications.ts`) need no server. Remote push
— win-back campaigns, announcements — needs the device's Expo push token on the
server.

- **Migration `0007_push_tokens.sql`** — `push_tokens` table, RLS own-rows.
- **Client** (`src/lib/pushTokens.ts`) registers the token on entering the app
  **only if notification permission is already granted** (it never prompts;
  the ask stays in the reminder opt-in). Logout removes the device's token.
- **Edge Function `send-push`** — an admin fan-out endpoint (NOT called by the
  app), protected by a shared secret.

### Setup

1. Run migration `0007`.
2. Deploy + secure the function:
   ```bash
   supabase functions deploy send-push
   supabase secrets set SEND_PUSH_SECRET=$(openssl rand -hex 32)
   ```
3. Push tokens require the EAS `projectId` (present in EAS builds; absent in
   Expo Go — registration no-ops there, which is fine for dev).
4. Send a campaign:
   ```bash
   curl -X POST https://YOUR_REF.supabase.co/functions/v1/send-push \
     -H "Authorization: Bearer $SEND_PUSH_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"title":"عدنا إليك!","body":"درسك التالي جاهز — دقيقتان فقط.","audience":"all"}'
   ```
   `audience` is `"all"` or an array of Supabase user ids. The function prunes
   `DeviceNotRegistered` tokens automatically.

---

## 3. Social sign-in (Apple + Google)

Built now, **configured later** (your decision). Both providers end in
`supabase.auth.signInWithIdToken()` (`src/lib/socialAuth.ts`); the login screen
renders each button only when it's usable, so they're invisible until you do
the setup below.

### Google

1. Google Cloud Console → **OAuth 2.0 Client IDs**: create a **Web** client
   (Supabase verifies against the web client id) plus iOS/Android clients.
2. Supabase → Auth → Providers → **Google**: paste the web client id + secret.
3. Add to `.env.local`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=....apps.googleusercontent.com`
4. The Google button appears once that env var is set. Native builds only
   (the module isn't in Expo Go — it's dynamically imported so the screen
   still works there).

### Apple

1. Apple Developer → enable **Sign in with Apple** for the app id; create a
   Services ID + key.
2. Supabase → Auth → Providers → **Apple**: fill in Services ID / Team ID /
   Key.
3. `app.json` → add the `expo-apple-authentication` plugin and the
   `usesAppleSignIn: true` iOS entitlement, then rebuild.
4. The Apple button appears automatically on capable iOS devices.

> **App Store rule:** once Google (or any third-party) sign-in ships on iOS,
> Sign in with Apple becomes **mandatory**. Enable both together before an iOS
> submission.
