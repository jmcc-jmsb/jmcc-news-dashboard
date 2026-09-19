// ABOUTME: Phone-width layout checks: no sideways scroll, reachable tabs, a slim pinned filter row,
// ABOUTME: touch-sized targets, and a jump link to the reports rail that stacks below the feed.
import { expect, test, type Page } from '@playwright/test';

// A touch phone, so `pointer: coarse` matches the way it does on a real device.
const phone = (width: number) => ({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });

// Not bare .article-card: the loading skeletons carry that class too, and a
// test that starts on skeletons measures a page a few hundred pixels long.
const loadedArticle = (page: Page) => page.locator('.article-card:not(.skel)').first();

async function openFeed(page: Page, path = '/') {
  await page.goto(path);
  await expect(loadedArticle(page)).toBeVisible();
}

async function scrollDown(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
}

for (const width of [360, 390]) {
  test.describe(`phone at ${width}px`, () => {
    test.use(phone(width));

    test('the page never scrolls sideways', async ({ page }) => {
      await openFeed(page);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    });

    test('every section tab is on screen', async ({ page }) => {
      await openFeed(page);
      // Measured against the phone's width, not with toBeInViewport: a mobile
      // browser widens its layout viewport to fit overflowing content, so an
      // off-screen tab still counts as "in the viewport" there.
      for (const tab of await page.locator('.dash-bar .nav-link').all()) {
        const right = await tab.evaluate((el) => el.getBoundingClientRect().right);
        expect(right).toBeLessThanOrEqual(width);
      }
    });

    test('the pinned filter row stays slim and the selected discipline is not covered', async ({ page }) => {
      await openFeed(page);
      await scrollDown(page, 1500);

      const bar = (await page.locator('.discipline-bar').boundingBox())!;
      expect(bar.y).toBe(0);
      expect(bar.height).toBeLessThanOrEqual(80);

      // Hit-test the middle of the active pill: anything stacked over it wins.
      const active = page.locator('.discipline-bar .pill.active');
      const box = (await active.boundingBox())!;
      const hit = await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.closest('.pill')?.classList.contains('active') ?? false,
        { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      );
      expect(hit).toBe(true);
    });

    for (const bar of ['.competition-bar', '.discipline-bar']) {
      test(`the last pill in ${bar} is scrolled into view when selected`, async ({ page }) => {
        await openFeed(page);
        await page.locator(`${bar} .pill`).last().click();
        // Reload: the selection comes back from the URL, and must still be on screen.
        await page.reload();
        await expect(loadedArticle(page)).toBeVisible();
        const { left, right } = await page
          .locator(`${bar} .pill.active`)
          .evaluate((el) => el.getBoundingClientRect());
        expect(left).toBeGreaterThanOrEqual(0);
        expect(right).toBeLessThanOrEqual(width);
      });
    }

    test('controls are at least 44px tall to tap', async ({ page }) => {
      await openFeed(page);
      const selectors = ['.nav-link', '.icon-btn', '.pill', '.ghost-btn', '.read-link', '.bm', '.reports-link'];
      for (const selector of selectors) {
        const box = await page.locator(selector).first().boundingBox();
        expect(box, selector).not.toBeNull();
        expect(box!.height, `${selector} height`).toBeGreaterThanOrEqual(44);
        expect(box!.width, `${selector} width`).toBeGreaterThanOrEqual(44);
      }
    });

    test('no tab or pill is squeezed narrower than its own label', async ({ page }) => {
      await openFeed(page);
      for (const el of await page.locator('.nav-link, .pill').all()) {
        const { label, scrollWidth, clientWidth } = await el.evaluate((e) => ({
          label: e.textContent,
          scrollWidth: e.scrollWidth,
          clientWidth: e.clientWidth,
        }));
        expect(scrollWidth, `"${label}" overflows its box`).toBeLessThanOrEqual(clientWidth);
      }
    });

    test('the reports link jumps to the reports rail', async ({ page }) => {
      await openFeed(page);
      const link = page.locator('.reports-link');
      await expect(link).toBeVisible();
      await link.click();
      await expect(page.locator('#reports .rail-title')).toBeInViewport();
    });
  });
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('has no reports link, because the rail sits beside the feed', async ({ page }) => {
    await openFeed(page);
    await expect(page.locator('.reports-link')).toBeHidden();
  });
});
