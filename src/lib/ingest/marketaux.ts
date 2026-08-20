// ABOUTME: Marketaux client — finance discipline only, English only (brief §10).
// ABOUTME: One request per run; Marketaux is a supplement to NewsData, not a second general source.

import { MARKETAUX_API_KEY } from 'astro:env/server';
import type { RawItem } from './normalize';

const ENDPOINT = 'https://api.marketaux.com/v1/news/all';

interface MarketauxArticle {
  title?: string;
  description?: string;
  url?: string;
  source?: string;
  published_at?: string;
}

/**
 * Finance only. Marketaux is a markets wire — it has nothing useful to say
 * about HR or Sustainability cases, and spending a request on them would be
 * noise in the feed rather than coverage.
 */
export async function fetchMarketaux(signal?: AbortSignal): Promise<RawItem[]> {
  if (!MARKETAUX_API_KEY) throw new Error('MARKETAUX_API_KEY is not set');

  const url = new URL(ENDPOINT);
  url.searchParams.set('api_token', MARKETAUX_API_KEY);
  url.searchParams.set('language', 'en');
  url.searchParams.set('countries', 'ca,us');
  url.searchParams.set('filter_entities', 'true');
  url.searchParams.set('limit', '25');

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Marketaux ${res.status}`);

  const body = (await res.json()) as { data?: MarketauxArticle[] };
  return (body.data ?? [])
    .filter((a): a is MarketauxArticle & { title: string; url: string } => Boolean(a.title && a.url))
    .map((a) => ({
      title: a.title,
      description: a.description ?? '',
      url: a.url,
      source: a.source ?? 'Marketaux',
      publishedAt: a.published_at ?? new Date().toISOString(),
    }));
}
