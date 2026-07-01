# Phase 6 — Subscriptions & Paywall Setup (RevenueCat + IAP)

The code is done. Turning it on requires accounts and console config that only
you can do. **Why RevenueCat + Apple/Google billing (not Stripe):** Apple and
Google *require* their own billing for digital subscriptions and will reject
the app if you use Stripe for in-app digital goods. RevenueCat wraps both
stores behind one SDK. Budget the 15–30% platform fee into your pricing.

## Prerequisites (paid accounts)

- **Apple Developer Program** — $99/year (for iOS + App Store IAP)
- **Google Play Console** — $25 one-time (for Android + Play Billing)
- **RevenueCat account** — free to start (revenuecat.com)

You can't fully test purchases without at least one of these, so Phase 6 is
partly a "do these console steps" checklist.

## 1. Define the products (in each store)

Create three auto-renewing subscriptions in **both** stores, matching the plan:

| Plan | Suggested product ID |
|------|----------------------|
| 4-week | `premium_4w` |
| 12-week | `premium_12w` |
| 24-week | `premium_24w` |

- **App Store Connect** → your app → Subscriptions → create a subscription group
  → add the three products with prices.
- **Google Play Console** → your app → Monetize → Subscriptions → create the
  three with base plans.

## 2. Configure RevenueCat

1. Create a project in RevenueCat; add your iOS and Android apps.
2. Connect the App Store and Play Console (RevenueCat has guided steps + needs
   an App Store Connect API key and a Play service-account JSON).
3. Create an **Entitlement** with identifier **`premium`** (the code checks this
   exact string — see `src/lib/entitlements.ts`).
4. Attach all three products to the `premium` entitlement.
5. Create an **Offering** (e.g. "default") containing the three packages. The
   paywall shows `offering.availablePackages`.
6. Copy the **public SDK keys** (one for iOS, one for Android).

## 3. Put the keys in the app

In `.env.local` (never commit real keys):
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx
```
> These are RevenueCat *public* SDK keys — designed to live in the app. They
> only allow what your store products permit, so shipping them is safe (unlike
> the Claude key, which must stay server-side).

## 4. Build a dev/production build (not Expo Go)

`react-native-purchases` is a native module — it does **not** run in Expo Go.
You need a development build:
```bash
npx expo prebuild
eas build --profile development --platform ios   # or android
```

## 5. Verify (the Phase 6 checklist)

- [ ] A sandbox/test purchase unlocks premium content and flips the app to
      subscribed (lessons past the first open without the paywall).
- [ ] **Restore purchases** works (Apple requires the button — it's on the paywall).
- [ ] The paywall shows the renewal price + period **before** purchase.
- [ ] Canceling/expiring re-locks premium features.
- [ ] The app uses **no Stripe** for digital subscriptions.
- [ ] `npm test` passes (entitlement-gating logic).

## How gating works in the code

- `src/lib/entitlements.ts` — pure logic: lesson 1 is free; lessons past
  `FREE_LESSON_LIMIT` need the `premium` entitlement. `shouldShowPaywall()`
  decides when a tap opens the paywall instead of the lesson.
- `src/lib/SubscriptionProvider.tsx` — holds entitlement status app-wide and
  syncs it to `users.subscription_status` in Supabase, so the coach's
  server-side rate limit sees the same paid/free truth.
- Today, Learn, and the lesson player all divert premium taps to `/paywall`
  when the user isn't subscribed; the coach gives subscribers unlimited questions.
