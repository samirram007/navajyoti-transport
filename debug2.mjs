import { chromium } from './node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // Capture console logs
  page.on('console', msg => {
    if (msg.text().includes('[DataTable]') || msg.text().includes('[ResourcePage]')) {
      console.log('BROWSER:', msg.text());
    }
  });

  // Login
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(2000);
  await page.fill('#email', 'admin@admin.com');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForTimeout(3000);

  // Navigate to riders?page=3
  console.log('--- Navigating to /riders?page=3 ---');
  await page.goto('http://localhost:5173/riders?page=3');
  await page.waitForTimeout(4000);

  console.log('Final URL:', page.url());
  const bodyText = await page.textContent('body');
  const pagMatch = bodyText.match(/Page \d+ of \d+/);
  console.log('Pagination:', pagMatch ? pagMatch[0] : 'NOT FOUND');

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
