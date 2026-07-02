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

    const { question } = await req.json();
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
    const { data: matches } = await supabase.rpc('match_lessons', {
      query_text: question,
      match_count: 3,
    });
    const lessons = (matches ?? []) as LessonMatch[];

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

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [
        {
          role: 'user',
          content: `المقتطفات من الدروس:\n\n${excerpts}\n\n---\nسؤال المستخدم: ${question}`,
        },
      ],
    });

    const answer = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
      .trim();

    // Cite the top-ranked lesson as the source.
    const citation = { lesson_id: lessons[0].id, title: lessons[0].title_ar };

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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
