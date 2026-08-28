import { test, expect, type Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@admin.com'
const ADMIN_PASSWORD = 'password'
const FRONTEND_URL = 'http://localhost:5173'

async function loginAsAdmin(page: Page) {
  await page.goto(FRONTEND_URL)
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  await page.fill('input[type="email"], input[name="email"], input#email', ADMIN_EMAIL)
  await page.fill('input[type="password"], input[name="password"], input#password', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
}

test.describe('Back button & pagination URL preservation', () => {
  // ── Riders page tests ──

  test('riders: page= param preserved on direct navigation', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${FRONTEND_URL}/riders?page=1`, { waitUntil: 'networkidle' })
    expect(page.url()).toContain('page=1')
  })

  test('riders: page= param preserved after reload', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${FRONTEND_URL}/riders?page=1`, { waitUntil: 'networkidle' })
    await page.reload({ waitUntil: 'networkidle' })
    expect(page.url()).toContain('page=1')
  })

  test('riders: back button works after navigating to fees/new', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${FRONTEND_URL}/riders?page=1`, { waitUntil: 'networkidle' })
    expect(page.url()).toContain('page=1')

    // Wait for table rows to load with data
    await expect(page.locator('table tbody tr td:not(:has-text("No results"))').first()).toBeVisible({ timeout: 15_000 })

    // Click the first +Fees link
    const feesLink = page.locator('a[href*="/fees/new"]').first()
    await expect(feesLink).toBeVisible({ timeout: 15_000 })
    await feesLink.click()
    await expect(page).toHaveURL(/\/fees\/new/, { timeout: 10_000 })

    // Go back — should return to /riders?page=1
    await page.goBack({ waitUntil: 'networkidle' })
    expect(page.url()).toContain('page=1')
  })

  // ── Fees page tests ──

  test('fees: page= param preserved on reload', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${FRONTEND_URL}/fees?page=1`, { waitUntil: 'networkidle' })
    await page.reload({ waitUntil: 'networkidle' })
    expect(page.url()).toContain('page=1')
  })

  test('fees: back button works after navigating to fees/new via New Fee button', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${FRONTEND_URL}/fees`, { waitUntil: 'networkidle' })

    // Wait for the page header to be visible
    await expect(page.locator('h1:has-text("Fees Collection")')).toBeVisible({ timeout: 10_000 })

    // Click the New Fee button (always visible, doesn't depend on data)
    const newFeeBtn = page.locator('button:has-text("New Fee")').first()
    await expect(newFeeBtn).toBeVisible({ timeout: 5_000 })
    await newFeeBtn.click()
    await expect(page).toHaveURL(/\/fees\/new/, { timeout: 10_000 })

    // Go back — should return to /fees
    await page.goBack({ waitUntil: 'networkidle' })
    expect(page.url()).toContain('/fees')
    expect(page.url()).not.toContain('/fees/new')
  })

  test('fees: back button works after navigating to fees/new via POS Mode', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${FRONTEND_URL}/fees`, { waitUntil: 'networkidle' })

    // Wait for the page header
    await expect(page.locator('h1:has-text("Fees Collection")')).toBeVisible({ timeout: 10_000 })

    // Click POS Mode button
    const posBtn = page.locator('button:has-text("POS Mode")').first()
    await expect(posBtn).toBeVisible({ timeout: 5_000 })
    await posBtn.click()
    await expect(page).toHaveURL(/\/fees\/new/, { timeout: 10_000 })

    // Go back — should return to /fees
    await page.goBack({ waitUntil: 'networkidle' })
    expect(page.url()).toContain('/fees')
    expect(page.url()).not.toContain('/fees/new')
  })
})
