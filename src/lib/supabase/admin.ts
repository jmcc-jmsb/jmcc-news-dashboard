// ABOUTME: Server-only Supabase client holding the secret key, which bypasses RLS entirely.
// ABOUTME: Importing this from client code is a BUILD ERROR — see env.schema in astro.config.mjs.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { SUPABASE_SECRET_KEY } from 'astro:env/server';

/**
 * This key bypasses Row Level Security. Everything it touches is unguarded, so
 * it may only ever be used from src/pages/api/ and this directory.
 *
 * That rule is enforced by the platform rather than by memory: the key is
 * declared `context: 'server', access: 'secret'` in astro.config.mjs, so
 * `astro:env/server` cannot be resolved from a client bundle and the build
 * fails rather than shipping it. The CI grep is the second line of defence.
 *
 * Reminder of what it can reach: this is a SHARED Supabase project with
 * jmcc-portal. The secret key can read and write every Portal table too —
 * profiles, teams, documents. Ingest must only ever touch news_* tables and
 * read `competitions`. Nothing here has any business writing to a Portal table.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  if (!PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    // Loud, not silent. The env fields are optional so a checkout with no
    // Supabase project still builds; the cost is that a missing key must fail
    // clearly at the moment of use rather than producing an unauthenticated
    // client that returns empty result sets forever.
    throw new Error(
      'Supabase is not configured: PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must both be set. ' +
        'See .env.example. This is the SHARED project with jmcc-portal.',
    );
  }

  cached = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
