// ============================================================================
// Embed lessons for semantic coach retrieval (Phase 13).
//
// Run AFTER content changes:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... VOYAGE_API_KEY=... \
//     npx tsx scripts/embed-lessons.ts [--dry-run]
//
// --dry-run lists which lessons would be (re)embedded without any writes.
// Secrets come from env only — never hardcode or commit them.
// ============================================================================
import { createClient } from '@supabase/supabase-js';

const VOYAGE_MODEL = 'voyage-3'; // 1024 dims — must match migration 0006

interface LessonRow {
  id: string;
  title_ar: string;
  body_ar: string;
  embedding: unknown | null;
}

async function embed(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: VOYAGE_MODEL, input: texts, input_type: 'document' }),
  });
  if (!res.ok) throw new Error(`Voyage API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data.map((d) => d.embedding);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const voyageKey = process.env.VOYAGE_API_KEY;

  if (!url || !serviceKey) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  if (!voyageKey && !dryRun) {
    console.error('Set VOYAGE_API_KEY (or use --dry-run).');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title_ar, body_ar, embedding');
  if (error) throw error;

  const lessons = (data ?? []) as LessonRow[];
  const pending = lessons.filter((l) => l.embedding === null);
  console.log(`${lessons.length} lessons; ${pending.length} without embeddings.`);

  if (dryRun) {
    for (const l of pending) console.log(`  would embed: ${l.title_ar} (${l.id})`);
    console.log('Dry run — no writes performed.');
    return;
  }
  if (pending.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // Voyage accepts batches; lesson catalogs are small, one batch suffices.
  const vectors = await embed(
    pending.map((l) => `${l.title_ar}\n${l.body_ar}`),
    voyageKey!
  );

  for (let i = 0; i < pending.length; i++) {
    const { error: upErr } = await supabase
      .from('lessons')
      .update({ embedding: vectors[i] })
      .eq('id', pending[i].id);
    if (upErr) throw upErr;
    console.log(`  embedded: ${pending[i].title_ar}`);
  }
  console.log('Done. The coach will use semantic retrieval once VOYAGE_API_KEY is set as a function secret.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
