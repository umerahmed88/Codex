-- ============================================================================
-- Phase 5 — Retrieval for the AI Coach
-- ============================================================================
-- The coach must answer ONLY from our lesson content. This migration adds a
-- full-text search function that returns the lessons most relevant to a
-- question, so the Edge Function can send ONLY those excerpts to the LLM.
--
-- We use Postgres full-text search (the 'simple' config tokenizes Arabic text
-- without stemming, which works well for keyword matching). This needs no
-- external embeddings API, so it runs the moment you have a Supabase project.
-- The production upgrade path — pgvector semantic embeddings — is noted in
-- docs/phase-5-setup.md; the Edge Function is structured so it can be swapped
-- in without touching the app.
-- ============================================================================

-- A generated tsvector column over the searchable lesson text, kept in sync
-- automatically by Postgres.
alter table public.lessons
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('simple', coalesce(title_ar, '') || ' ' || coalesce(body_ar, ''))
  ) stored;

create index if not exists idx_lessons_search on public.lessons using gin (search_vector);

-- match_lessons: given a free-text question, return the top-N most relevant
-- lessons ranked by relevance. SECURITY DEFINER so the Edge Function can call
-- it; it only reads content (no private data), so this is safe.
create or replace function public.match_lessons(query_text text, match_count integer default 3)
returns table (
  id uuid,
  track_id uuid,
  day_number integer,
  title_ar text,
  body_ar text,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.track_id,
    l.day_number,
    l.title_ar,
    l.body_ar,
    ts_rank(l.search_vector, websearch_to_tsquery('simple', query_text)) as rank
  from public.lessons l
  where l.search_vector @@ websearch_to_tsquery('simple', query_text)
  order by rank desc
  limit greatest(match_count, 1);
$$;

-- Allow authenticated users (and the service role) to call it.
grant execute on function public.match_lessons(text, integer) to authenticated, service_role;
