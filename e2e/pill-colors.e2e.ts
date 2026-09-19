// ABOUTME: The selected pill keeps its label colour (the page background token) under hover and
// ABOUTME: after a tap, in both themes — hover used to turn it black on maroon.
import { expect, test, type Locator, type Page } from '@playwright/test';

async function openFeed(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => localStorage.setItem('jmcc_theme', JSON.stringify(t)), theme);
  await page.goto('/');
  // Not bare .article-card: the loading skeletons carry that class too.
  await expect(page.locator('.article-card:not(.skel)').first()).toBeVisible();
}

// The active pill's label is --bg: cream on maroon in light, black on gold in dark.
async function expectLabelIsPageBackground(page: Page, pill: Locator) {
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // Polled: .pill transitions colour over 120ms.
  await expect.poll(() => pill.evaluate((el) => getComputedStyle(el).color)).toBe(bg);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme`, () => {
    test.describe('mouse', () => {
      test.use({ viewport: { width: 1280, height: 800 } });

      test('hovering the selected pill keeps its label colour', async ({ page }) => {
        await openFeed(page, theme);
        const active = page.locator('.discipline-bar .pill.active');
        await active.hover();
        await expectLabelIsPageBackground(page, active);
      });
    });

    test.describe('touch', () => {
      // A phone leaves :hover on whatever was last tapped, so the just-selected
      // pill is also the hovered one.
      test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

      test('a tapped pill shows the selected label colour', async ({ page }) => {
        await openFeed(page, theme);
        await page.locator('.discipline-bar .pill:not(.active)').first().tap();
        await expectLabelIsPageBackground(page, page.locator('.discipline-bar .pill.active'));
      });
    });
  });
}
