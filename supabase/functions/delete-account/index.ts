// Supabase Edge Function: delete-account
//
// Permanently deletes the caller's own auth.users row. public.users and every
// row that references it (recipes, meal_plans, meal_plan_slots,
// shopping_list_items, followed_creators) cascade-delete via the `on delete
// cascade` foreign keys set up in the initial schema migration — this
// function only needs to remove the auth user with the service role key,
// since anon/authenticated clients aren't allowed to call admin.deleteUser.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: callerUser },
    } = await callerClient.auth.getUser();

    if (!callerUser) {
      return jsonResponse({ error: 'unauthorized', message: 'You must be signed in to delete your account.' }, 401);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await adminClient.auth.admin.deleteUser(callerUser.id);

    if (error) {
      console.error('delete-account error:', error);
      return jsonResponse({ error: 'delete_failed', message: 'Could not delete your account. Please try again.' }, 500);
    }

    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('delete-account error:', error);
    return jsonResponse({ error: 'delete_failed', message: 'Something went wrong. Please try again.' }, 500);
  }
});
