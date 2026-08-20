// ABOUTME: English-only i18n shim — same signatures as jmcc-website's so Nav/Footer copy over near-unchanged.
// ABOUTME: getLocalizedPath() returns ABSOLUTE main-site URLs, because this dashboard is a separate host.

import en from './en.json';

// This dashboard is English-only (brief §1). The type stays a union rather than
// the literal 'en' so the copied Nav/Footer, which still declare an
// `alternateLang`, keep typechecking without edits.
export type Locale = 'en' | 'fr';
type Dict = typeof en;
export type TranslationKey = keyof Dict;

/* The canonical public site. Every nav and footer link resolves against it.
   jmcc-website's config calls this the primary domain and 301s jmccjmsb.ca here.

   This constant is why this file exists in the form it does. On the website,
   nav hrefs are root-relative ('/who-we-are') because the nav and the pages
   share an origin. Here they do not: the dashboard is its own deployment on its
   own subdomain, so a root-relative href would resolve to a dashboard route
   that does not exist and 404. Absorbing that in getLocalizedPath() rather than
   editing ~15 hrefs in Nav.astro keeps the hand re-copy in HANDOFF cheap — the
   copied components stay byte-identical apart from a two-line header block. */
const MAIN_SITE = 'https://www.wecompete.ca';

export function useTranslations(_lang: Locale) {
  // No French dictionary ships here (brief §1: "Drop fr.json"). The parameter is
  // kept so the call site in the copied Nav.astro does not need editing.
  return function t(key: TranslationKey): string {
    return en[key];
  };
}

/** Absolute URL on the main site. `lang` is honoured so the FR toggle works. */
export function getLocalizedPath(path: string, lang: Locale): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'en') return `${MAIN_SITE}${normalized}`;
  return normalized === '/' ? `${MAIN_SITE}/fr` : `${MAIN_SITE}/fr${normalized}`;
}

/** Always 'en'. The dashboard has no /fr routes and never will (brief §1). */
export function getLangFromUrl(_url: URL): Locale {
  return 'en';
}
