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

## Production upgrade: semantic search with embeddings

Full-text search matches keywords. For semantic matching ("how do I make a good
first impression?" finding a lesson titled "قوة الانطباع الأول" even without
shared words), the upgrade is **pgvector embeddings**:

1. `create extension vector;` and add an `embedding vector(1024)` column to
   `lessons`.
2. Generate embeddings for each lesson with an embeddings provider (Voyage AI
   is Anthropic's recommended partner) and store them.
3. Replace `match_lessons` with a cosine-distance query over the embeddings.

The Edge Function's retrieval step is isolated, so this swap doesn't touch the
app or the prompt logic. Not required for launch with a small lesson set.
