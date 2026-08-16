// Supabase Edge Function: revenuecat-webhook
//
// Receives RevenueCat's server-to-server "Webhooks" events and mirrors
// subscription state onto public.users (is_pro / pro_product_id /
// pro_expires_at), so other edge functions (extract-recipe) can enforce the
// free-tier limit without calling out to RevenueCat on every request.
//
// Configure in the RevenueCat dashboard under Project Settings > Webhooks:
//   URL: https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header value: same string as the REVENUECAT_WEBHOOK_SECRET
//     secret below (set with `supabase secrets set`).
//
// app_user_id on every event is expected to be our Supabase auth user id —
// the client calls Purchases.logIn(supabaseUserId) right after sign in, so
// RevenueCat's app_user_id and our users.id are the same value.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';

const PRO_ACTIVATING_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
]);

const PRO_DEACTIVATING_EVENTS = new Set(['EXPIRATION']);

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  expiration_at_ms?: number | null;
  transferred_from?: string[];
  transferred_to?: string[];
}

function isRealUserId(appUserId: string): boolean {
  // RevenueCat assigns its own anonymous ids (`$RCAnonymousID:...`) before
  // our client calls Purchases.logIn(supabaseUserId); those never map to a
  // users row and should be ignored rather than throw a lookup error.
  return !!appUserId && !appUserId.startsWith('$RCAnonymousID:');
}

async function setProStatus(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  update: { is_pro: boolean; pro_product_id: string | null; pro_expires_at: string | null }
) {
  const { error } = await adminClient.from('users').update(update).eq('id', userId);
  if (error) console.error(`revenuecat-webhook: failed to update user ${userId}:`, error.message);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (REVENUECAT_WEBHOOK_SECRET && req.headers.get('Authorization') !== REVENUECAT_WEBHOOK_SECRET) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  try {
    const body = await req.json();
    const event = body?.event as RevenueCatEvent | undefined;
    if (!event || typeof event.type !== 'string') {
      return jsonResponse({ error: 'invalid_payload' }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const expiresAt =
      typeof event.expiration_at_ms === 'number' ? new Date(event.expiration_at_ms).toISOString() : null;

    if (event.type === 'TRANSFER') {
      for (const fromId of event.transferred_from ?? []) {
        if (isRealUserId(fromId)) {
          await setProStatus(adminClient, fromId, { is_pro: false, pro_product_id: null, pro_expires_at: null });
        }
      }
      for (const toId of event.transferred_to ?? []) {
        if (isRealUserId(toId)) {
          await setProStatus(adminClient, toId, {
            is_pro: true,
            pro_product_id: event.product_id ?? null,
            pro_expires_at: expiresAt,
          });
        }
      }
      return jsonResponse({ received: true });
    }

    if (!isRealUserId(event.app_user_id)) {
      return jsonResponse({ received: true, skipped: 'anonymous_user' });
    }

    if (PRO_ACTIVATING_EVENTS.has(event.type)) {
      await setProStatus(adminClient, event.app_user_id, {
        is_pro: true,
        pro_product_id: event.product_id ?? null,
        pro_expires_at: expiresAt,
      });
    } else if (event.type === 'CANCELLATION') {
      // Auto-renew turned off, but the entitlement stays active until it
      // actually expires — just keep pro_expires_at current.
      await adminClient.from('users').update({ pro_expires_at: expiresAt }).eq('id', event.app_user_id);
    } else if (PRO_DEACTIVATING_EVENTS.has(event.type)) {
      await setProStatus(adminClient, event.app_user_id, {
        is_pro: false,
        pro_product_id: null,
        pro_expires_at: null,
      });
    }
    // BILLING_ISSUE and other event types are informational only — RevenueCat
    // keeps the entitlement active through its own grace period, so no
    // users row change is needed until a later EXPIRATION/RENEWAL arrives.

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('revenuecat-webhook error:', error);
    return jsonResponse({ error: 'webhook_failed' }, 500);
  }
});
