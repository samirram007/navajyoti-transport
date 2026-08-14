import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: process.env.CI ? 'never' : 'on-failure' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    // ── Backend: seed DB then start Laravel on port 8000 ──
    {
      command:
        'cd ../api && php artisan migrate:fresh --seed --force 2>&1 && php artisan serve --port=8000 2>&1',
      port: 8000,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    // ── Frontend: start Vite with API pointing to local Laravel ──
    {
      command: 'pnpm dev --port 5173 --mode test',
      port: 5173,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
