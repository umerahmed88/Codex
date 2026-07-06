// ============================================================================
// Phase 15 — send-push Edge Function (remote push fan-out)
// ============================================================================
// The primitive for win-back campaigns and announcements: takes a title/body
// and an audience, looks up the registered Expo push tokens, and fans out via
// the Expo Push API.
//
// This is an ADMIN endpoint — it is NOT called by the app. It's protected by
// a shared secret (SEND_PUSH_SECRET), same pattern as the RevenueCat webhook.
//
// Deploy + call:
//   supabase functions deploy send-push
//   supabase secrets set SEND_PUSH_SECRET=$(openssl rand -hex 32)
//   curl -X POST https://YOUR_REF.supabase.co/functions/v1/send-push \
//     -H "Authorization: Bearer $SEND_PUSH_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"title":"عدنا إليك!","body":"درسك التالي جاهز — دقيقتان فقط.","audience":"all"}'
//
// Body: { title: string, body: string, audience: 'all' | string[] (user ids) }
// ============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo's max messages per request

Deno.serve(async (req: Request) => {
  try {
    // --- Shared-secret auth (constant secret, not a user JWT) ---------------
    const secret = Deno.env.get('SEND_PUSH_SECRET');
    const auth = req.headers.get('Authorization');
    if (!secret || auth !== `Bearer ${secret}`) {
      return json({ error: 'unauthorized' }, 401);
    }

    const { title, body, audience } = await req.json();
    if (typeof title !== 'string' || title.length === 0 || typeof body !== 'string' || body.length === 0) {
      return json({ error: 'title and body are required' }, 400);
    }
    const isAll = audience === 'all';
    const userIds = Array.isArray(audience) ? (audience as string[]) : null;
    if (!isAll && !userIds) {
      return json({ error: 'audience must be "all" or an array of user ids' }, 400);
    }

    // Service role: this admin function may read every row in push_tokens.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let query = supabase.from('push_tokens').select('token');
    if (userIds) query = query.in('user_id', userIds);
    const { data: rows, error } = await query;
    if (error) throw error;

    const tokens = (rows ?? []).map((r: { token: string }) => r.token);
    if (tokens.length === 0) {
      return json({ sent: 0, note: 'no registered tokens for this audience' });
    }

    // --- Fan out in Expo-sized chunks ----------------------------------------
    let sent = 0;
    const invalid: string[] = [];
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk.map((to) => ({ to, title, body, sound: 'default' }))),
      });
      if (!res.ok) {
        console.error('[send-push] expo push error', res.status, await res.text());
        continue;
      }
      const result = (await res.json()) as {
        data?: { status: string; details?: { error?: string } }[];
      };
      (result.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sent++;
        } else if (ticket.details?.error === 'DeviceNotRegistered') {
          invalid.push(chunk[idx]); // app uninstalled / token expired
        }
      });
    }

    // Prune dead tokens so future sends stay fast and clean.
    if (invalid.length > 0) {
      await supabase.from('push_tokens').delete().in('token', invalid);
    }

    return json({ sent, pruned: invalid.length, audienceSize: tokens.length });
  } catch (err) {
    console.error('[send-push] error', err);
    return json({ error: 'internal_error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
