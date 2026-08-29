const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await context.newPage();

  // Force light mode via class
  await page.addInitScript(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  });

  // Login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.fill('input[type="email"], input[name="email"], input#email', 'admin@admin.com');
  await page.fill('input[type="password"], input[name="password"], input#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const pages = [
    { url: '/fees?page=1', name: 'fees-list' },
    { url: '/riders', name: 'riders-list' },
    { url: '/vehicles', name: 'vehicles-list' },
    { url: '/expenses', name: 'expenses-list' },
    { url: '/credit-notes', name: 'credit-notes-list' },
    { url: '/fee-heads', name: 'fee-heads-list' },
    { url: '/expense-heads', name: 'expense-heads-list' },
    { url: '/expense-groups', name: 'expense-groups-list' },
    { url: '/income-groups', name: 'income-groups-list' },
    { url: '/fiscal-years', name: 'fiscal-years-list' },
    { url: '/slots', name: 'slots-list' },
    { url: '/schools', name: 'schools-list' },
  ];

  for (const p of pages) {
    try {
      await page.goto(`http://localhost:5173${p.url}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `light-${p.name}.png`, fullPage: true });
      console.log(`✅ ${p.name}`);
    } catch (err) {
      console.log(`❌ ${p.name}: ${err.message.substring(0, 80)}`);
    }
  }

  await browser.close();
  console.log('\nDone! Check light-*.png files.');
})();
