// ABOUTME: The International section renders its six competitions and each one selects like any discipline.
// ABOUTME: On fixtures these feeds are empty, so this also pins that an empty feed reads as empty, not broken.
import { expect, test } from '@playwright/test';

const COMPETITIONS = ['TUBC', 'Eller', 'HICC', 'MICC', 'UNICC', 'BBICC'];

test.use({ viewport: { width: 1280, height: 800 } });

test('the International section lists the six case competitions', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.article-card:not(.skel)').first()).toBeVisible();

  await page.locator('.competition-bar .pill', { hasText: 'International' }).click();

  const pills = page.locator('.discipline-bar .pill');
  await expect(pills).toHaveText(COMPETITIONS);
});

test('selecting a competition shows its feed and survives a reload', async ({ page }) => {
  await page.goto('/?discipline=unicc');

  await expect(page.locator('.section-title')).toHaveText('UNICC');
  await expect(page.locator('.discipline-bar .pill.active')).toHaveText('UNICC');
  // The competition follows from the discipline: no ?competition in the URL.
  expect(new URL(page.url()).searchParams.get('competition')).toBeNull();
  await expect(page.locator('.competition-bar .pill.active')).toHaveText('International');

  // Fixtures carry no international articles, so this is the empty state. It
  // has to read as "nothing today", never as an outage.
  await expect(page.locator('.empty')).toContainText('No recent articles found for UNICC');
  await expect(page.locator('.empty')).not.toContainText('unavailable');

  await page.reload();
  await expect(page.locator('.discipline-bar .pill.active')).toHaveText('UNICC');
});

test('an event with no public site is named without a dead link', async ({ page }) => {
  await page.goto('/?discipline=bbicc');
  await expect(page.locator('.section-title')).toHaveText('BBICC');

  const events = page.locator('.competition-events');
  await expect(events).toContainText('Belgrade Business International Case Competition');
  // BBICC has no url in the website's registry, so its name carries no link.
  await expect(events.locator('a')).toHaveCount(0);
});

test('a section of many events names only the selected one, and the bar stays one row', async ({ page }) => {
  await page.goto('/?discipline=tubc');
  await expect(page.locator('.section-title')).toHaveText('TUBC');

  // Six events listed in full wrapped to four lines and pushed the section
  // pills into three rows. Each pill here IS an event, so the strip follows
  // the selection instead of repeating all six.
  const events = page.locator('.competition-events');
  await expect(events).toContainText('Thammasat Undergraduate Business Challenge');
  await expect(events).not.toContainText('Marshall International Case Competition');

  const rows = await page.locator('.competition-bar .pill').evaluateAll(
    (pills) => new Set(pills.map((p) => p.getBoundingClientRect().top)).size,
  );
  expect(rows).toBe(1);
});

test('a section of two events still names both, because JDCC is not JDC', async ({ page }) => {
  await page.goto('/?discipline=finance');
  const events = page.locator('.competition-events');
  await expect(events).toContainText('Jeux du Commerce');
  await expect(events).toContainText('JDC Central');
});
