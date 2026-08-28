import { chromium } from './node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // 1. Login
  console.log('--- Logging in ---');
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(2000);
  await page.fill('#email', 'admin@admin.com');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForTimeout(3000);
  console.log('URL after login:', page.url());

  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  console.log('Token:', token ? token.substring(0, 30) + '...' : 'null');

  if (!token) {
    console.error('ERROR: No token found — login may have failed');
    await browser.close();
    process.exit(1);
  }

  // 2. Check API response structure
  console.log('\n--- Checking API response structure ---');
  const apiRes = await page.evaluate(async (tok) => {
    const r = await fetch('/api/riders?page=1&per_page=10', {
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/json' }
    });
    return { status: r.status, body: await r.json() };
  }, token);
  console.log('Status:', apiRes.status);
  console.log('Response keys:', Object.keys(apiRes.body));
  if (apiRes.body.pagination) console.log('Has "pagination":', JSON.stringify(apiRes.body.pagination).slice(0, 200));
  if (apiRes.body.meta) console.log('Has "meta":', JSON.stringify(apiRes.body.meta).slice(0, 200));

  // 3. Set saved page size to 25
  console.log('\n--- Setting page size to 25 ---');
  const initVals = await page.evaluate(async (tok) => {
    const r = await fetch('/api/user-initial-values', {
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/json' }
    });
    return r.json();
  }, token);
  const items = initVals?.data || [];
  const existing = Array.isArray(items) ? items.find(i => i.key === 'dataTablePageSize') : null;
  console.log('Current pageSize:', existing?.value || 'not set');

  if (existing) {
    await page.evaluate(async (tok, id) => {
      await fetch(`/api/user-initial-values/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ key: 'dataTablePageSize', value: '25' })
      });
    }, token, existing.id);
  } else {
    await page.evaluate(async (tok) => {
      await fetch('/api/user-initial-values', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ key: 'dataTablePageSize', value: '25' })
      });
    }, token);
  }
  console.log('Set dataTablePageSize to 25');

  // 4. Navigate to riders with ?page=3
  console.log('\n--- Navigating to /riders?page=3 ---');
  await page.goto('http://localhost:5173/riders?page=3');
  await page.waitForTimeout(4000);

  const bodyText = await page.textContent('body');
  const pagMatch = bodyText.match(/Page \d+ of \d+/);
  console.log('Pagination text:', pagMatch ? pagMatch[0] : 'NOT FOUND');

  const rowMatch = bodyText.match(/\d+ \/ \d+ rows/);
  console.log('Row count display:', rowMatch ? rowMatch[0] : 'NOT FOUND');

  const dropdownValue = await page.evaluate(() => {
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      const opts = Array.from(sel.options).map(o => o.value);
      if (opts.includes('10') && opts.includes('25')) {
        return { value: sel.value, label: sel.options[sel.selectedIndex]?.text };
      }
    }
    return null;
  });
  console.log('Page size dropdown:', dropdownValue);

  await page.screenshot({ path: '/tmp/page3-verify.png', fullPage: false });
  console.log('Screenshot saved to /tmp/page3-verify.png');

  // 5. Click page 5
  console.log('\n--- Clicking page 5 ---');
  const page5Btn = page.locator('button').filter({ hasText: /^5$/ }).first();
  if (await page5Btn.isVisible()) {
    await page5Btn.click();
    await page.waitForTimeout(2500);
    const t2 = await page.textContent('body');
    const p2 = t2.match(/Page \d+ of \d+/);
    console.log('After click page 5:', p2 ? p2[0] : 'NOT FOUND');
    console.log('URL:', page.url());
    await page.screenshot({ path: '/tmp/page5-verify.png', fullPage: false });
  }

  // 6. Browser back → should return to page 3
  console.log('\n--- Browser back ---');
  await page.goBack();
  await page.waitForTimeout(2500);
  const t3 = await page.textContent('body');
  const p3 = t3.match(/Page \d+ of \d+/);
  console.log('After back:', p3 ? p3[0] : 'NOT FOUND');
  console.log('URL:', page.url());
  await page.screenshot({ path: '/tmp/page-back-verify.png', fullPage: false });

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
