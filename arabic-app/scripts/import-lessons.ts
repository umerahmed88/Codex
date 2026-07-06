// ============================================================================
// Content import pipeline (Phase 14).
//
// Authors fill in a CSV (start from content/template.csv) or a JSON array of
// the same fields, then run:
//
//   npx tsx scripts/import-lessons.ts content/my-track.csv --dry-run   # validate only
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/import-lessons.ts content/my-track.csv           # import
//
// --dry-run needs no network or keys: it parses + validates and prints what
// WOULD be imported. The real run upserts tracks (by slug) and lessons (by
// track + day), so re-importing an edited file updates in place — no dupes.
// After importing, re-run scripts/embed-lessons.ts if semantic coach
// retrieval is enabled (new lessons need embeddings).
//
// Secrets come from env only — never hardcode or commit them.
// ============================================================================
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  parseCsv,
  csvToRecords,
  validateContent,
  type RawContentRow,
} from '../src/lib/contentValidation';

function loadRows(path: string): RawContentRow[] {
  const text = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) return JSON.parse(text) as RawContentRow[];
  return csvToRecords(parseCsv(text));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const path = args.find((a) => !a.startsWith('--'));
  if (!path) {
    console.error('Usage: npx tsx scripts/import-lessons.ts <file.csv|file.json> [--dry-run]');
    process.exit(1);
  }

  const rows = loadRows(path);
  const result = validateContent(rows);

  console.log(`${path}: ${rows.length} rows → ${result.tracks.length} track(s), ${result.lessons.length} lesson(s).`);
  if (!result.ok) {
    console.error(`\n${result.errors.length} validation error(s):`);
    for (const e of result.errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log('Validation passed.');

  if (dryRun) {
    for (const t of result.tracks) {
      const days = result.lessons.filter((l) => l.track_slug === t.slug).length;
      console.log(`  would import: ${t.title_ar} (${t.slug}) — ${days} lessons`);
    }
    console.log('Dry run — no writes performed.');
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or use --dry-run).');
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  // Upsert tracks by slug. New tracks are appended after existing ones.
  const { data: existingTracks, error: tracksErr } = await supabase
    .from('tracks')
    .select('id, slug, "order"');
  if (tracksErr) throw tracksErr;
  let nextOrder = Math.max(-1, ...(existingTracks ?? []).map((t) => t.order)) + 1;

  const trackIdBySlug = new Map<string, string>();
  for (const t of existingTracks ?? []) trackIdBySlug.set(t.slug, t.id);

  for (const track of result.tracks) {
    if (trackIdBySlug.has(track.slug)) {
      console.log(`  track exists: ${track.slug}`);
      continue;
    }
    const { data: inserted, error } = await supabase
      .from('tracks')
      .insert({
        slug: track.slug,
        title_ar: track.title_ar,
        title_en: track.title_en,
        description_ar: track.description_ar,
        order: nextOrder++,
      })
      .select('id')
      .single();
    if (error) throw error;
    trackIdBySlug.set(track.slug, inserted.id);
    console.log(`  created track: ${track.title_ar} (${track.slug})`);
  }

  // Upsert lessons on (track_id, day_number) — matches the unique constraint
  // from migration 0001, so edits update in place.
  for (const lesson of result.lessons) {
    const trackId = trackIdBySlug.get(lesson.track_slug)!;
    const { error } = await supabase.from('lessons').upsert(
      {
        track_id: trackId,
        day_number: lesson.day_number,
        title_ar: lesson.title_ar,
        body_ar: lesson.body_ar,
        media_type: 'text',
        est_minutes: lesson.est_minutes,
        order: lesson.day_number,
        embedding: null, // content changed → needs (re)embedding
      },
      { onConflict: 'track_id,day_number' }
    );
    if (error) throw error;
    console.log(`  upserted: يوم ${lesson.day_number} — ${lesson.title_ar}`);
  }

  console.log(
    '\nDone. If semantic coach retrieval is enabled, re-index now:\n' +
      '  npx tsx scripts/embed-lessons.ts'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
