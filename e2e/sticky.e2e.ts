// ABOUTME: Desktop sticky stack: the discipline bar pins below the dash bar, and the rail below both,
// ABOUTME: so scrolling never hides the selected discipline or the top of the rail under another bar.
import { expect, test, type Page } from '@playwright/test';

async function openAndScroll(page: Page) {
  await page.goto('/');
  // Not bare .article-card: the loading skeletons carry that class too.
  await expect(page.locator('.article-card:not(.skel)').first()).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
}

// Mouse and touch: a touch screen gets 44px controls, which makes the dash bar
// taller, so a hardcoded offset would be right for one and wrong for the other.
for (const touch of [false, true]) {
  test.describe(`desktop, ${touch ? 'touch' : 'mouse'}`, () => {
    test.use({ viewport: { width: 1280, height: 800 }, hasTouch: touch });

    test('the discipline bar pins directly below the dash bar', async ({ page }) => {
      await openAndScroll(page);
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(touch);

      const dash = (await page.locator('.dash-bar').boundingBox())!;
      const disc = (await page.locator('.discipline-bar').boundingBox())!;
      expect(dash.y).toBe(0);
      expect(disc.y).toBeCloseTo(dash.y + dash.height, 0);

      // Hit-test the middle of the active pill: anything stacked over it wins.
      const pill = (await page.locator('.discipline-bar .pill.active').boundingBox())!;
      const hit = await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.closest('.pill')?.classList.contains('active') ?? false,
        { x: pill.x + pill.width / 2, y: pill.y + pill.height / 2 },
      );
      expect(hit).toBe(true);
    });

    test('the rail sticks below both bars, not under them', async ({ page }) => {
      await openAndScroll(page);
      const disc = (await page.locator('.discipline-bar').boundingBox())!;
      const railTop = await page.locator('.col-rail').evaluate((el) => parseFloat(getComputedStyle(el).top));
      expect(railTop).toBeGreaterThanOrEqual(disc.y + disc.height);
    });
  });
}

// Tablet: the rail stacks under the feed (below 981px) but both bars still pin
// (above 700px), so the Reports jump has to clear the pair of them.
test.describe('tablet', () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true });

  test('the reports link lands the reports block below both pinned bars', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.article-card:not(.skel)').first()).toBeVisible();
    await page.locator('.reports-link').click();

    // The jump is a smooth scroll (global.css). Measuring mid-flight would pass
    // trivially, with the title still far down the screen, so wait for it to stop.
    let last = -1;
    await expect
      .poll(async () => {
        const y = await page.evaluate(() => window.scrollY);
        const settled = y === last && y > 0;
        last = y;
        return settled;
      }, { intervals: [150] })
      .toBe(true);

    // The block, not its title: the jump target is the block, and its kicker
    // and top border sit above the title.
    const disc = (await page.locator('.discipline-bar').boundingBox())!;
    const reports = (await page.locator('#reports').boundingBox())!;
    expect(reports.y).toBeGreaterThanOrEqual(disc.y + disc.height);
  });
});
