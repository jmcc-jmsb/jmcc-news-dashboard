// ABOUTME: Vercel Analytics and Speed Insights are mounted on every page, and stay quiet off Vercel.
// ABOUTME: Guards the page shell: an <Analytics /> dropped from BaseLayout reports nothing and says nothing.
import { expect, test } from '@playwright/test';

test('both are mounted on the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.article-card:not(.skel)').first()).toBeVisible();

  await expect(page.locator('body > vercel-analytics')).toHaveCount(1);
  await expect(page.locator('body > vercel-speed-insights')).toHaveCount(1);
});

test('neither reports anything, and nothing errors, off a Vercel deployment', async ({ page }) => {
  const errors: string[] = [];
  const offsite: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  /* Every host, not just /_vercel/insights: version 2 of both packages builds
     its intake URL from a seed generated at build time ("resilient intake"),
     so the path is not fixed and a check against one path could pass while the
     page beacons somewhere else. Everything else on this page is local — the
     fonts are bundled and the APIs are same-origin. */
  page.on('request', (r) => {
    const { hostname } = new URL(r.url());
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') offsite.push(`${r.method()} ${r.url()}`);
  });

  await page.goto('/');
  await expect(page.locator('.article-card:not(.skel)').first()).toBeVisible();
  await page.waitForTimeout(1000);

  /* Off a Vercel deployment both packages run in debug mode, which FETCHES a
     script from va.vercel-scripts.com and then logs to the console instead of
     reporting. So the exact allowance is: those two GETs and nothing else — no
     POST, no beacon, no third host. A data beacon would show up here. */
  expect(offsite).toEqual([
    'GET https://va.vercel-scripts.com/v1/script.debug.js',
    'GET https://va.vercel-scripts.com/v1/speed-insights/script.debug.js',
  ]);
  expect(errors).toEqual([]);
});
