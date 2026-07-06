// ============================================================================
// Phase 5 — AI Coach Edge Function (runs server-side on Supabase)
// ============================================================================
// WHY server-side: the Claude API key is a secret and must NEVER ship in the
// mobile app. This function holds it (as a Supabase secret) and is the only
// place that talks to Claude.
//
// Flow: verify the user → enforce free/paid rate limit → retrieve the most
// relevant lessons → send ONLY those excerpts + the question to Claude with a
// strict "answer only from these excerpts" instruction → store the exchange →
// return the answer plus a citation to the source lesson.
// ============================================================================
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FREE_DAILY_LIMIT = 3; // free users; paid users are unlimited
const HISTORY_TURNS = 6; // mirror of src/lib/coach.ts
const MAX_QUESTION_LENGTH = 500; // mirror of src/lib/coach.ts
const PER_MINUTE_LIMIT = 3; // burst guard, applies to paid users too
const MODEL = 'claude-opus-4-8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LessonMatch {
  id: string;
  title_ar: string;
  body_ar: string;
  day_number: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401);
    }

    // A Supabase client scoped to the calling user — RLS applies, so the user
    // can only ever read/write their own rows.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { question, stream } = await req.json();
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return json({ error: 'empty_question' }, 400);
    }
    // Length cap (mirrors MAX_QUESTION_LENGTH in src/lib/coach.ts) — bounds
    // per-request LLM cost regardless of tier.
    if (question.trim().length > MAX_QUESTION_LENGTH) {
      return json({ error: 'question_too_long', limit: MAX_QUESTION_LENGTH }, 400);
    }

    // --- Burst guard: max PER_MINUTE_LIMIT questions/min, paid users too. -----
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const { count: lastMinuteCount } = await supabase
      .from('coach_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneMinuteAgo.toISOString());
    if ((lastMinuteCount ?? 0) >= PER_MINUTE_LIMIT) {
      return json({ error: 'rate_limited_burst', limit: PER_MINUTE_LIMIT }, 429);
    }

    // --- Rate limit: free users get FREE_DAILY_LIMIT questions per day. -------
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', user.id)
      .maybeSingle();
    const isPaid = profile?.subscription_status === 'active';

    if (!isPaid) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString());
      if ((count ?? 0) >= FREE_DAILY_LIMIT) {
        return json({ error: 'rate_limited', limit: FREE_DAILY_LIMIT }, 429);
      }
    }

    // --- Retrieve the most relevant lessons ----------------------------------
    // Semantic (embeddings) when VOYAGE_API_KEY is configured; otherwise the
    // FTS path from migration 0003. Semantic failures fall through to FTS —
    // retrieval must never take the coach down.
    let lessons: LessonMatch[] = [];
    const voyageKey = Deno.env.get('VOYAGE_API_KEY');
    if (voyageKey) {
      try {
        const queryEmbedding = await embedQuery(question, voyageKey);
        const { data: semantic } = await supabase.rpc('match_lessons_semantic', {
          query_embedding: queryEmbedding,
          match_count: 3,
        });
        lessons = (semantic ?? []) as LessonMatch[];
      } catch (e) {
        console.error('[coach] semantic retrieval failed, falling back to FTS', e);
      }
    }
    if (lessons.length === 0) {
      const { data: matches } = await supabase.rpc('match_lessons', {
        query_text: question,
        match_count: 3,
      });
      lessons = (matches ?? []) as LessonMatch[];
    }

    // If nothing in our content matches, answer honestly WITHOUT calling the
    // LLM — cheaper, and guarantees no hallucination.
    if (lessons.length === 0) {
      const answer = 'هذا الموضوع غير مغطّى في دروسنا بعد. جرّب سؤالاً متعلقاً بمهارات التواصل والكاريزما.';
      await supabase.from('coach_messages').insert({
        user_id: user.id,
        question,
        answer,
        cited_lesson_id: null,
      });
      return json({ answer, citation: null });
    }

    // --- Build the grounded prompt (ONLY the retrieved excerpts) -------------
    const excerpts = lessons
      .map((l, i) => `[${i + 1}] الدرس: ${l.title_ar}\n${l.body_ar}`)
      .join('\n\n');

    const system =
      'أنت مدرب تعليمي داخل تطبيق لتطوير الذات. أجب باللغة العربية، مستخدماً فقط ' +
      'المقتطفات المقدّمة من الدروس أدناه. إذا لم تكن الإجابة موجودة في هذه المقتطفات، ' +
      'قل بأدب إنّ الموضوع غير مغطّى بعد ووجّه المستخدم إلى أقرب درس ذي صلة. لا تختلق ' +
      'معلومات أبداً. للأسئلة الطبية أو النفسية الحرجة، اعتذر بلطف ووضّح أنك أداة تعليمية ' +
      'وليست بديلاً عن مختص، ثم أعد التوجيه إلى محتوى الدروس. اجعل إجابتك موجزة وعملية.';

    // --- Conversation memory: the last HISTORY_TURNS answered exchanges ------
    // (mirrors toChatHistory in src/lib/coach.ts — tested there)
    const { data: historyRows } = await supabase
      .from('coach_messages')
      .select('question, answer')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(HISTORY_TURNS);
    const history = (historyRows ?? [])
      .filter((h) => h.answer !== null && h.answer !== '')
      .reverse()
      .flatMap((h) => [
        { role: 'user' as const, content: h.question as string },
        { role: 'assistant' as const, content: h.answer as string },
      ]);

    const messages = [
      ...history,
      {
        role: 'user' as const,
        content: `المقتطفات من الدروس:\n\n${excerpts}\n\n---\nسؤال المستخدم: ${question}`,
      },
    ];

    // Cite the top-ranked lesson as the source (known before generation).
    const citation = { lesson_id: lessons[0].id, title: lessons[0].title_ar };

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    // --- Streaming path (Phase 13): raw text chunks; citation in headers so
    // the client has it before the first token. The exchange is stored after
    // the stream finishes.
    if (stream === true) {
      const llmStream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages,
      });

      const encoder = new TextEncoder();
      let full = '';
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          llmStream.on('text', (delta: string) => {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          });
          llmStream.on('end', async () => {
            try {
              await supabase.from('coach_messages').insert({
                user_id: user.id,
                question,
                answer: full.trim(),
                cited_lesson_id: citation.lesson_id,
              });
            } catch (e) {
              console.error('[coach] failed to store streamed exchange', e);
            }
            controller.close();
          });
          llmStream.on('error', (e: unknown) => {
            console.error('[coach] stream error', e);
            controller.error(e);
          });
        },
      });

      return new Response(body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Citation-Lesson-Id': citation.lesson_id,
          // Header values must be Latin-1; Arabic titles are URI-encoded.
          'X-Citation-Title': encodeURIComponent(citation.title),
          'Access-Control-Expose-Headers': 'X-Citation-Lesson-Id, X-Citation-Title',
        },
      });
    }

    // --- Non-streaming path (fallback / older clients) ------------------------
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages,
    });

    const answer = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
      .trim();

    await supabase.from('coach_messages').insert({
      user_id: user.id,
      question,
      answer,
      cited_lesson_id: citation.lesson_id,
    });

    return json({ answer, citation });
  } catch (err) {
    console.error('[coach] error', err);
    return json({ error: 'internal_error' }, 500);
  }
});

// Embed the user's question with Voyage AI (voyage-3, 1024 dims — must match
// the vector(1024) column in migration 0006).
async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: 'voyage-3', input: [text], input_type: 'query' }),
  });
  if (!res.ok) throw new Error(`voyage ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
