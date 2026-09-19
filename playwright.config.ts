// ABOUTME: Playwright config for the browser tests in e2e/ — layout checks vitest cannot see.
// ABOUTME: Boots `astro dev` on fixtures, so no Supabase project or API keys are needed.
import { defineConfig } from '@playwright/test';

const PORT = 4322;

export default defineConfig({
  testDir: 'e2e',
  // `.e2e.ts`, not `.test.ts`, so vitest's default glob never picks these up.
  testMatch: '*.e2e.ts',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
  },
  webServer: {
    // --ignore-lock: Astro 7 refuses a second dev server per project, and the
    // one a developer already has open should not block the test run.
    command: `npm run dev -- --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: {
      PUBLIC_USE_FIXTURES: 'true',
      // Astro 7 detaches `astro dev` into a background process when it detects
      // an AI agent, and Playwright reads the parent exiting as a crash. This
      // is the variable Astro sets on its own background child to keep it in
      // the foreground; without it, agent-run e2e fails before a test starts.
      ASTRO_DEV_BACKGROUND: '1',
    },
  },
});
