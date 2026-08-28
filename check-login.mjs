import { chromium } from './node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // 1. Check login page structure
  console.log('--- Checking login page ---');
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());

  // Screenshot the login page
  await page.screenshot({ path: '/tmp/login-page.png', fullPage: false });

  // List all inputs
  const inputs = await page.evaluate(() => {
    const els = document.querySelectorAll('input, button');
    return Array.from(els).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      placeholder: el.placeholder,
      text: el.textContent?.trim().slice(0, 50),
      id: el.id
    }));
  });
  console.log('Form elements:', JSON.stringify(inputs, null, 2));

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
