// ============================================================================
// Streaming client for the AI Coach (Phase 13).
//
// WHY not supabase.functions.invoke: invoke() buffers the whole response, so
// the user stares at a spinner for the full generation. Here we POST with
// `stream: true` using `fetch` from `expo/fetch` (which supports streaming
// response bodies on native, unlike RN's built-in fetch) and surface tokens
// as they arrive via onDelta.
//
// The citation is known server-side BEFORE generation starts, so the Edge
// Function puts it in response headers — we have it from the first byte.
//
// Callers should catch errors and fall back to the non-streaming useAskCoach
// mutation (see app/(tabs)/coach.tsx); streaming is an enhancement, never a
// requirement.
// ============================================================================
import { fetch as expoFetch } from 'expo/fetch';
import type { Citation } from './coach';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export interface AskCoachStreamArgs {
  question: string;
  accessToken: string; // the user's Supabase session JWT
  // Called with the FULL text so far on each chunk (simplest to render).
  onDelta: (textSoFar: string) => void;
  // Abort mid-stream (screen unmounted, user navigated away). The promise
  // rejects with code 'aborted', which callers should swallow silently.
  signal?: AbortSignal;
}

export interface StreamedCoachAnswer {
  answer: string;
  citation: Citation | null;
}

// Ask the coach with streaming. Throws normalized error codes so the screen
// can map them to messages or fall back:
//   'rate_limited'        — daily free limit reached (429)
//   'rate_limited_burst'  — per-minute burst guard (429)
//   'question_too_long'   — server-side length cap (400)
//   'stream_unsupported'  — this runtime can't read streaming bodies
//   'aborted'             — the caller cancelled (e.g. screen unmounted)
//   'coach_error'         — anything else
export async function askCoachStream({
  question,
  accessToken,
  onDelta,
  signal,
}: AskCoachStreamArgs): Promise<StreamedCoachAnswer> {
  try {
    return await doStream({ question, accessToken, onDelta, signal });
  } catch (e) {
    // Normalize every flavor of cancellation (fetch rejection, reader
    // rejection, DOMException) to one stable code.
    if (signal?.aborted || (e instanceof Error && e.name === 'AbortError')) {
      throw new Error('aborted');
    }
    throw e;
  }
}

async function doStream({
  question,
  accessToken,
  onDelta,
  signal,
}: AskCoachStreamArgs): Promise<StreamedCoachAnswer> {
  const res = await expoFetch(`${SUPABASE_URL}/functions/v1/coach`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ question, stream: true }),
    signal,
  });

  if (!res.ok) {
    // Error responses are JSON ({ error: code }) even on the streaming route.
    let code = 'coach_error';
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) code = data.error;
    } catch {
      // non-JSON error body — keep the generic code
    }
    throw new Error(code);
  }

  // Citation arrives in headers (Arabic title is URI-encoded — headers must
  // be Latin-1).
  const lessonId = res.headers.get('X-Citation-Lesson-Id');
  const rawTitle = res.headers.get('X-Citation-Title');
  const citation: Citation | null =
    lessonId && rawTitle ? { lesson_id: lessonId, title: decodeURIComponent(rawTitle) } : null;

  const bodyStream = res.body;
  if (!bodyStream) {
    // Runtime buffered/dropped the body — tell the caller to use the
    // non-streaming path instead.
    throw new Error('stream_unsupported');
  }

  const reader = bodyStream.getReader();
  const decoder = new TextDecoder();
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onDelta(full);
  }
  full += decoder.decode(); // flush any trailing multi-byte sequence
  onDelta(full);

  return { answer: full.trim(), citation };
}
