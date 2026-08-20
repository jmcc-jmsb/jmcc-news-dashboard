// ABOUTME: Astro config — SSR on Vercel, React islands, Tailwind 4 via the Vite plugin.
// ABOUTME: The dashboard shell prerenders; /api routes and the ingest cron are server-rendered.
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// The canonical host. Every absolute URL derives from it — never hardcode a
// hostname in a component or page.
//
// ⚠ OPEN ITEM: brief §14 specifies news.jmccjmsb.ca, but jmcc-website's config
// says "wecompete.ca is primary; jmccjmsb.ca is legacy and 301s here", while
// jmcc-portal uses portal.jmccjmsb.ca. The three repos disagree. Using the
// brief's value until the owner confirms; this is a one-line change either way.
export default defineConfig({
  site: 'https://news.jmccjmsb.ca',

  // Server output, because the ingest and digest crons in vercel.json need a
  // runtime and cPanel cannot give them one (brief §1). The dashboard page
  // itself opts back into prerendering — it is a static shell around a
  // client:only island, so there is nothing for the server to render per-request.
  output: 'server',
  adapter: vercel(),

  integrations: [react(), sitemap()],

  /* Secrets are enforced by the platform rather than by naming convention.
     `context: 'server', access: 'secret'` means importing one of these from
     client code is a build error, not a code-review catch. This is the same
     mechanism jmcc-portal uses, and it is what brief §14 ("service-role and API
     keys must never be PUBLIC_") actually needs to be true.

     Everything is optional so `npm run build` works on a checkout with no
     Supabase project or API keys yet — Sprint 0 runs entirely on fixtures.
     The consumers fail loudly at runtime instead. */
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),

      SUPABASE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      NEWSDATA_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      MARKETAUX_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CRON_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
