# Phase 5 — AI Coach Setup (deploying the Edge Function)

The coach's brain runs in a **Supabase Edge Function** so the Claude API key
never ships in the app. Here's how to deploy it.

## 1. Run the retrieval migration

In the Supabase SQL Editor, run `supabase/migrations/0003_coach_retrieval.sql`
(adds the lesson search index + `match_lessons` function).

## 2. Get a Claude API key

1. Go to https://console.anthropic.com → **API Keys** → create a key.
2. Add credit to the account (the coach uses the `claude-opus-4-8` model).

## 3. Install the Supabase CLI and log in

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF   # from your project's URL
```

## 4. Store the API key as a secret (never in code)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

This is the Phase-2 lesson again: **secrets live in the environment, not the
repo.** The key sits in Supabase's secret store; the function reads it at
runtime via `Deno.env.get('ANTHROPIC_API_KEY')`.

## 5. Deploy the function

```bash
supabase functions deploy coach
```

## 6. Verify (the Phase 5 checklist)

- [ ] Ask a question answerable from the content (e.g. "كيف أبدأ محادثة؟") →
      returns an Arabic answer **with** a citation to the right lesson.
- [ ] Ask something not covered (e.g. "ما هي عاصمة اليابان؟") → returns an
      honest "not covered yet" pointer, **not** a made-up answer.
- [ ] As a free user, ask 4 questions in a day → the 4th is rate-limited.
- [ ] Unit tests pass: `npm test` (rate-limit logic).

## How grounding works (the anti-hallucination design)

1. The function runs `match_lessons(question)` to find the most relevant lessons.
2. It sends **only those lesson excerpts** + the question to Claude.
3. The system prompt instructs Claude to answer **only** from those excerpts,
   to say "not covered" otherwise, and to redirect medical/crisis questions.
4. If retrieval finds nothing, the function answers "not covered" **without
   calling Claude at all** — zero chance of hallucination, and no API cost.

## Coach v2 (Phase 13): streaming, memory, semantic retrieval

Phase 13 upgraded the coach. Everything below is **optional at deploy time** —
each feature degrades gracefully when its prerequisite is missing.

### Streaming answers

The function accepts `{ "stream": true }` in the request body and then returns
the answer as a plain-text stream (tokens appear as they're generated) instead
of one JSON blob. The citation is sent in response **headers**
(`X-Citation-Lesson-Id`, `X-Citation-Title` — the Arabic title is URI-encoded
because headers must be Latin-1), so the client shows the source immediately.

Client side, `src/lib/coachStream.ts` uses `fetch` from `expo/fetch` (which
supports streaming response bodies, unlike React Native's built-in fetch). The
Coach screen tries streaming first and **falls back automatically** to the
original non-streaming request if anything goes wrong — older clients and the
JSON path keep working unchanged. Nothing to configure.

### Conversation memory

The function now sends the user's last 6 answered exchanges (from
`coach_messages`, which we were already storing) as prior turns in the Claude
call, so follow-up questions like "وكيف أطبق ذلك في العمل؟" work. The pure
history-shaping logic is `toChatHistory` in `src/lib/coach.ts` (unit-tested).
Nothing to configure.

### Semantic retrieval (optional — needs a Voyage AI key)

Full-text search matches keywords. Semantic search matches **meaning**: "how do
I make a good first impression?" finds "قوة الانطباع الأول" even with no shared
words. The pieces:

1. **Run migration** `supabase/migrations/0006_coach_embeddings.sql` — enables
   the `vector` extension, adds `lessons.embedding vector(1024)`, and creates
   `match_lessons_semantic()` (cosine distance).
2. **Get a Voyage AI key** (https://www.voyageai.com — Anthropic's recommended
   embeddings partner) and set it as a function secret:
   ```bash
   supabase secrets set VOYAGE_API_KEY=pa-...
   ```
3. **Index the lessons** (embeds every lesson body with `voyage-3`, 1024 dims):
   ```bash
   cd arabic-app
   SUPABASE_URL=https://YOUR_REF.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
   VOYAGE_API_KEY=pa-... \
   npx tsx scripts/embed-lessons.ts        # add --dry-run to validate first
   ```
   Re-run it whenever lesson content changes.

At question time the function embeds the query and uses
`match_lessons_semantic`; **if `VOYAGE_API_KEY` isn't set (or the call fails),
it silently falls back to the FTS `match_lessons`** — retrieval can never take
the coach down. The grounding design (answer only from excerpts) is unchanged.
