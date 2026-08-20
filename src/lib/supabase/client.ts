// ABOUTME: Browser-safe Supabase client using the publishable key — reads flow through RLS.
// ABOUTME: Only ever sees rows the anon policies in supabase/migrations expose.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from 'astro:env/client';

/**
 * The publishable key is safe in a browser bundle: every read it performs is
 * filtered by Row Level Security. What that means concretely here — see
 * supabase/migrations/20260820000001_news_schema.sql:
 *
 *   news_articles / news_reports / news_sources / news_discipline_topics — readable
 *   news_sponsors                                — only rows where active is true
 *   news_digest_subscribers                      — NO policy, so zero rows, ever
 *
 * The dashboard is public and unauthenticated, so there is no session to carry
 * and no reason to persist one.
 */
let cached: SupabaseClient | null = null;

export function supabaseClient(): SupabaseClient {
  if (cached) return cached;

  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Supabase is not configured: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.',
    );
  }

  cached = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
