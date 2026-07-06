-- ============================================================================
-- Phase 13 — Semantic retrieval for the AI Coach (optional upgrade)
-- ============================================================================
-- Full-text search (0003) matches keywords; embeddings match MEANING — e.g.
-- "how do I make a good first impression?" finds "قوة الانطباع الأول" even
-- with zero shared words. This migration adds the storage + query function.
--
-- OPTIONAL-ON DESIGN: the coach Edge Function only uses semantic matching
-- when a VOYAGE_API_KEY secret is configured AND a lesson has an embedding;
-- otherwise it falls back to the existing FTS path. Running this migration
-- with no embeddings populated changes nothing about behavior.
--
-- Populate/refresh embeddings with: scripts/embed-lessons.ts (see
-- docs/phase-5-setup.md → Semantic retrieval).
-- ============================================================================

create extension if not exists vector;

-- 1024 dims = Voyage AI's voyage-3 model (Anthropic's recommended partner).
alter table public.lessons
  add column if not exists embedding vector(1024);

-- IVF/HNSW indexes only pay off at thousands of rows; a track catalog is tiny,
-- so exact scan is both simpler and faster here. Revisit if lessons > ~10k.

create or replace function public.match_lessons_semantic(
  query_embedding vector(1024),
  match_count integer default 3
)
returns table (
  id uuid,
  track_id uuid,
  day_number integer,
  title_ar text,
  body_ar text,
  similarity real
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
    (1 - (l.embedding <=> query_embedding))::real as similarity
  from public.lessons l
  where l.embedding is not null
  order by l.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_lessons_semantic(vector, integer)
  to authenticated, service_role;
