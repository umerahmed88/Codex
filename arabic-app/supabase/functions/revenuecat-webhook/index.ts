// ============================================================================
// Phase 11 — RevenueCat webhook (server-authoritative subscription state)
// ============================================================================
// Until now the APP told the server "I'm subscribed" (SubscriptionProvider
// syncs after RevenueCat events fire on-device). That leaves a hole: if a
// subscription expires and the user never reopens the app, the server keeps
// treating them as premium (e.g. unlimited coach questions).
//
// RevenueCat calls this function on every billing event, making the SERVER
// the authority. The client sync remains as a fast path for instant UI.
//
// Setup (docs/phase-11-server-authority.md):
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random string>
//   RevenueCat dashboard → Integrations → Webhooks → URL of this function,
//   Authorization header value = that same secret.
// ============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

// RevenueCat event types → the subscription_status they imply.
// https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
const ACTIVATING_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
]);
const DEACTIVATING_EVENTS = new Set(['EXPIRATION']);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  // Shared-secret auth: RevenueCat sends the configured value verbatim in the
  // Authorization header. Constant string compare is fine for a random secret.
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== secret) {
    return new Response('unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const event = body?.event;
    const type: string = event?.type ?? '';
    // app_user_id is the Supabase user id — set via configurePurchases(userId).
    const appUserId: string = event?.app_user_id ?? '';

    if (!appUserId) return json({ ok: false, reason: 'no app_user_id' }, 200);

    let status: 'active' | 'free' | null = null;
    if (ACTIVATING_EVENTS.has(type)) status = 'active';
    else if (DEACTIVATING_EVENTS.has(type)) status = 'free';
    // CANCELLATION = auto-renew turned off but entitlement still active until
    // period end — EXPIRATION will arrive later, so we deliberately ignore it.

    if (status === null) return json({ ok: true, ignored: type }, 200);

    // Service-role client: this function is trusted; RLS does not apply.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await admin
      .from('users')
      .update({ subscription_status: status })
      .eq('id', appUserId);
    if (error) throw error;

    return json({ ok: true, applied: { type, status } }, 200);
  } catch (err) {
    console.error('[revenuecat-webhook] error', err);
    // 500 → RevenueCat retries the delivery.
    return json({ ok: false }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
