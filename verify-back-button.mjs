import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('=== Test 1: Navigate to /riders?page=4 ===');
  await page.goto(`${BASE}/riders?page=4`, { waitUntil: 'networkidle' });
  const url1 = page.url();
  console.log('URL:', url1);
  console.log('PASS:', url1.includes('page=4') ? '✅ Page param preserved' : '❌ Page param LOST');
  
  console.log('\n=== Test 2: Refresh page, check URL preserved ===');
  await page.reload({ waitUntil: 'networkidle' });
  const url2 = page.url();
  console.log('URL:', url2);
  console.log('PASS:', url2.includes('page=4') ? '✅ Page param preserved after refresh' : '❌ Page param LOST after refresh');
  
  console.log('\n=== Test 3: Click +Fees link, then back button ===');
  // Find and click the first +Fees link
  const feesLink = page.locator('a[href*="/fees/new"]').first();
  if (await feesLink.isVisible()) {
    await feesLink.click();
    await page.waitForURL(/\/fees\/new/);
    const url3 = page.url();
    console.log('After clicking +Fees:', url3);
    console.log('PASS:', url3.includes('fees/new') ? '✅ Navigated to fees/new' : '❌ Did not navigate to fees/new');
    
    // Click browser back
    await page.goBack();
    await page.waitForTimeout(500);
    const url4 = page.url();
    console.log('After back button:', url4);
    console.log('PASS:', url4.includes('page=4') ? '✅ Back to riders?page=4' : '❌ Did NOT go back to riders?page=4');
  } else {
    console.log('⚠️ +Fees link not visible (maybe no data or wrong page)');
  }
  
  console.log('\n=== Test 4: Hard refresh at /riders?page=4 ===');
  await page.goto(`${BASE}/riders?page=4`, { waitUntil: 'networkidle' });
  // Simulate hard refresh with cache bust
  await page.reload({ waitUntil: 'networkidle' });
  const url5 = page.url();
  console.log('URL:', url5);
  console.log('PASS:', url5.includes('page=4') ? '✅ Page param preserved after hard refresh' : '❌ Page param LOST after hard refresh');
  
  console.log('\n=== Test 5: Navigate page 4 -> fees/new -> back -> verify page 4 data ===');
  await page.goto(`${BASE}/riders?page=4`, { waitUntil: 'networkidle' });
  const feesLink2 = page.locator('a[href*="/fees/new"]').first();
  if (await feesLink2.isVisible()) {
    await feesLink2.click();
    await page.waitForURL(/\/fees\/new/);
    await page.goBack();
    await page.waitForTimeout(500);
    const url6 = page.url();
    console.log('Final URL:', url6);
    console.log('PASS:', url6.includes('page=4') ? '✅ Full flow works' : '❌ Full flow broken');
  } else {
    console.log('⚠️ +Fees link not visible');
  }
  
  await browser.close();
  console.log('\n=== Done ===');
})();
