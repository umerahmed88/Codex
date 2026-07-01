# Phase 9 — CI/CD, Builds & Store Submission

The code + pipelines are in place. This is the human checklist to actually ship.

---

## Part A — The automated pipeline (already wired)

### CI (`.github/workflows/ci.yml`)
Runs on every push/PR: `tsc --noEmit` + `npm test`. This keeps `main` green.
No secrets needed.

### Builds (`.github/workflows/eas-build.yml`)
- **Merge to `main`** → EAS builds a **preview** and distributes to internal testers.
- **Push a `vX.Y.Z` tag** → EAS builds **production** and submits to the stores.

**One secret to add:** in GitHub → repo **Settings → Secrets and variables →
Actions**, add `EXPO_TOKEN` (create it at expo.dev → Account → Access Tokens).

### Build profiles (`eas.json`)
| Profile | Distribution | OTA channel | Use |
|---------|-------------|-------------|-----|
| development | internal | development | dev client on your device |
| preview | internal | preview | share test builds with testers |
| production | store | production | App Store / Play submissions |

---

## Part B — One-time EAS setup (run locally / in Codespaces)

```bash
npm install -g eas-cli
eas login
eas init                 # links this project to your Expo account (writes projectId)
eas update:configure     # sets up EAS Update (OTA) + the updates URL
```

Store your secrets as **EAS secrets** (never in the repo):
```bash
eas secret:create --name SENTRY_AUTH_TOKEN --value <token>   # for source-map upload
```

### Shipping an OTA (JS-only) bugfix — minutes, no store review
```bash
eas update --branch production --message "Fix streak off-by-one"
```
This reaches users on next launch. Native changes still need a new build.

---

## Part C — Store assets & metadata checklist (BOTH stores)

Generate/prepare these before submitting:

- [ ] **App icon** — 1024×1024 PNG (no transparency for iOS)
- [ ] **Splash screen** — already in `assets/`
- [ ] **Screenshots** — Arabic UI, per required device size:
      - iOS: 6.7" and 5.5" iPhone (+ iPad if you support it)
      - Android: phone + 7"/10" tablet
- [ ] **Store descriptions** — Arabic (primary) + English: title, subtitle,
      full description, keywords
- [ ] **Privacy Policy URL** + **Terms URL** (replace the `example.com`
      placeholders in `app/(tabs)/profile.tsx` with real hosted pages)
- [ ] **Apple Privacy Nutrition Labels** (App Store) / **Data Safety form**
      (Play) — declare: account/email, usage analytics, crash data (Sentry)
- [ ] **Age rating** — questionnaire in both consoles (this app is 4+/Everyone)
- [ ] **Subscription disclosure text** — the auto-renew terms Apple/Google
      require, matching what the paywall shows

---

## Part D — App Store Connect (iOS) — manual steps

1. Enroll in the **Apple Developer Program** ($99/yr).
2. **App Store Connect** → **My Apps → +** → create the app record
   (bundle ID `com.riseguide.arabic`, primary language Arabic).
3. **In-app purchases** → create the 3 auto-renewing subscriptions
   (`premium_4w`, `premium_12w`, `premium_24w`) in one subscription group;
   set prices; add localized names/descriptions. Fill the required
   subscription disclosure.
4. **App Privacy** → complete the nutrition labels.
5. **TestFlight** → after the first production build lands, add internal
   testers to try sandbox purchases.
6. Fill metadata + screenshots → **Submit for Review**.

## Part E — Google Play Console (Android) — manual steps

1. Pay the **Play Console** one-time $25; create a developer account.
2. **Create app** (package `com.riseguide.arabic`, default language Arabic).
3. **Monetize → Subscriptions** → create the 3 products with base plans + prices.
4. **App content** → Data Safety form, privacy policy URL, ads declaration, age rating.
5. **Testing → Internal testing** → upload the first production build; add
   tester emails to try sandbox purchases.
6. Complete the store listing (Arabic + English, screenshots) → roll out to
   internal testing, then production.

---

## Verify (Phase 9 checklist)

- [ ] `eas build --profile production` produces installable iOS + Android artifacts
- [ ] `eas update --branch production` reaches a test device on next launch
- [ ] The app is on TestFlight (iOS) and Play internal testing (Android)
- [ ] Every store asset + disclosure above is accounted for
- [ ] CI is green on `main`; a `vX.Y.Z` tag triggers a production build
