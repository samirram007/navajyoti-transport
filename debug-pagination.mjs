import { chromium } from './node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // Login
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(2000);
  await page.fill('#email', 'admin@admin.com');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForTimeout(3000);

  const token = await page.evaluate(() => localStorage.getItem('access_token'));

  // Navigate to riders?page=3
  console.log('Navigating to /riders?page=3');
  await page.goto('http://localhost:5173/riders?page=3');

  // Check at various time intervals
  for (const delay of [500, 1000, 2000, 4000]) {
    await page.waitForTimeout(delay === 500 ? delay : delay - (delay === 1000 ? 500 : delay === 2000 ? 1000 : 2000));
    const bodyText = await page.textContent('body');
    const pagMatch = bodyText.match(/Page \d+ of \d+/);
    const rowMatch = bodyText.match(/\d+ \/ \d+ rows/);
    const url = page.url();
    console.log(`  t=${delay}ms: "${pagMatch?.[0]}" | "${rowMatch?.[0]}" | URL: ${url}`);
  }

  // Check the DataTable's internal pagination via React devtools hook
  const debug = await page.evaluate(() => {
    // Try to read the select element value (should reflect DataTable's internal state)
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      const opts = Array.from(sel.options).map(o => o.value);
      if (opts.includes('10') && opts.includes('25')) {
        return { selectValue: sel.value };
      }
    }
    return null;
  });
  console.log('Select value:', debug);

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
