# Running the app in GitHub Codespaces

You don't need anything installed on your own computer. Everything below runs
in the browser.

## 1. Open the Codespace

1. On GitHub, go to your `Codex` repo.
2. Switch to the branch **`claude/new-repo-folder-u8r4th`** (branch dropdown,
   top-left of the file list).
3. Click the green **`< > Code`** button → **Codespaces** tab →
   **Create codespace on this branch**.
4. Wait ~1–2 minutes. The `.devcontainer` config auto-installs Node and runs
   `npm install` for you.

## 2. Add your Supabase keys

In the Codespace terminal:
```bash
cd arabic-app
cp .env.example .env.local
```
Open `.env.local` (double-click it in the file tree) and paste your values
from Supabase → Project Settings → API:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
(See `docs/phase-2-setup.md` for creating the Supabase project + running the
SQL files first.)

## 3. Start the app

Because a Codespace is a *remote* machine, your phone can't reach it on the
local network — so use **tunnel mode**, which routes through a public URL:
```bash
npx expo start --tunnel
```
The first run may ask to install `@expo/ngrok` — say yes (or it's already
installed by the devcontainer).

## 4. See it on your phone

1. Install **Expo Go** from the App Store / Play Store on your phone.
2. In the terminal, Expo prints a **QR code**.
3. Scan it with your phone's camera (iOS) or the Expo Go app (Android).
4. The app opens on your device, talking to your Codespace.

> Prefer the browser? Run `npx expo start --tunnel` then press `w` to open the
> web build. Note some native features (secure storage, notifications) behave
> differently on web — the phone is the truest preview.

## Everyday loop from here

- I (Claude) push code to the branch.
- In your Codespace terminal: `git pull` to get the latest.
- `npx expo start --tunnel` to run it.
- Edits you make in the Codespace: `git add . && git commit && git push`.
