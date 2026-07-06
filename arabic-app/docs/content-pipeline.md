# Content Pipeline — authoring and importing lessons (Phase 14)

How new tracks and lessons get into the app **without touching SQL**. The
flow: author a CSV → validate locally → import → (optionally) re-embed for
the coach.

## 1. Author

Copy `content/template.csv` and fill it in — one row per lesson:

| Column | Required | Rules |
|--------|----------|-------|
| `track_slug` | ✅ | lowercase-hyphenated ascii id, e.g. `self-confidence`. Same value on every row of the track. |
| `track_title_ar` | first row of each track | Arabic track name shown in the app. |
| `track_title_en` | – | Optional English name (analytics/dashboards). |
| `track_description_ar` | – | One sentence, shown under the track name. |
| `day_number` | ✅ | Integer starting at **1**, contiguous (1, 2, 3… — a gap breaks the unlock chain). |
| `title_ar` | ✅ | Arabic, ≤ 80 chars — one line on a small phone. |
| `body_ar` | ✅ | Arabic, 50–2000 chars (~1–3 min read — "bite-sized" is the product). |
| `est_minutes` | – | Integer 1–60; defaults to 5. |

CSV quoting: wrap any field containing commas, quotes, or line breaks in
double quotes; write a literal quote as `""` (the template shows both).
Save as **UTF-8** — the validator rejects files with mangled encoding.

A JSON array of objects with the same keys also works (`.json` extension).

### Authoring guidelines (tone & RTL pitfalls)

- **Tone:** practical, warm, second person ("جرّب اليوم…"), Modern Standard
  Arabic that reads easily out loud. One idea per lesson; end with one
  concrete action the user can do today.
- **Length:** aim for 400–900 chars of body. The cap (2000) is a ceiling,
  not a target.
- **RTL pitfalls:** don't hand-insert Unicode direction marks; the app is
  RTL-first and handles layout. Keep Latin fragments (brand names, numbers)
  short — long LTR runs inside Arabic sentences read badly. Use Arabic
  punctuation (، ؟) inside Arabic text.
- Every lesson must be answerable content for the coach — write facts the
  coach can cite, not teasers.

## 2. Validate (no keys or network needed)

```bash
cd arabic-app
npx tsx scripts/import-lessons.ts content/my-track.csv --dry-run
```

Errors print with the data-row number (row 1 = first lesson line in the
file). The validation rules live in `src/lib/contentValidation.ts` and are
unit-tested — CI keeps them honest.

## 3. Import

```bash
SUPABASE_URL=https://YOUR_REF.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
npx tsx scripts/import-lessons.ts content/my-track.csv
```

- Tracks are matched by `slug` (new ones are appended after existing ones);
  lessons upsert on `(track, day)` — **re-importing an edited file updates
  in place**, no duplicates.
- Imported/edited lessons get their embedding cleared, so re-run the
  indexer if semantic coach retrieval is on:
  `npx tsx scripts/embed-lessons.ts` (see docs/phase-5-setup.md).
- The service-role key bypasses RLS — treat it like a production password:
  env var only, never committed, never in the app.

## Multi-track behavior in the app

- The seed now ships **two tracks**: التواصل والكاريزما and الثقة بالنفس.
- The Learn screen shows a track switcher **only when more than one track
  exists**; the choice persists (AsyncStorage `settings:selectedTrack`) and
  the Today screen follows it.
- A new user's initial track comes from their onboarding interest choice
  (`interestConfidence` → الثقة بالنفس; everything else → التواصل والكاريزما)
  — mapping in `src/lib/tracks.ts`.
- The free tier (`FREE_LESSON_LIMIT` in `src/lib/entitlements.ts`) applies
  **per track**: day 1 of every track is free.
