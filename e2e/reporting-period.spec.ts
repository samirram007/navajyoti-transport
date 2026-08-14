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

test.describe('Global reporting period', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('header shows a reporting period control with a date range', async ({ page }) => {
    // The control is in the app header
    const trigger = page.locator('button[aria-haspopup="dialog"]').first()
    await expect(trigger).toBeVisible({ timeout: 10_000 })
    // Shows a "From – To" range (two formatted dates separated by –)
    await expect(trigger).toContainText('–', { timeout: 10_000 })
  })

  test('opening the control shows From/To inputs and a Default button', async ({ page }) => {
    const trigger = page.locator('button[aria-haspopup="dialog"]').first()
    await expect(trigger).toBeVisible({ timeout: 10_000 })
    await trigger.click()

    const fromInput = page.locator('input[type="date"]').first()
    const toInput = page.locator('input[type="date"]').nth(1)
    await expect(fromInput).toBeVisible({ timeout: 3_000 })
    await expect(toInput).toBeVisible({ timeout: 3_000 })

    // Both inputs are pre-filled from the fiscal year default
    const fromVal = await fromInput.inputValue()
    const toVal = await toInput.inputValue()
    expect(fromVal).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(toVal).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // The Default button is present (and enabled only when a custom period is set)
    await expect(page.locator('button:has-text("Default")')).toBeVisible({ timeout: 3_000 })
    await page.keyboard.press('Escape')
  })

  test('a report page auto-fills its From/To filters from the reporting period', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/reports/rider-fee-collection`)
    await expect(page.getByRole('heading', { name: 'Rider Fee Collection' })).toBeVisible({ timeout: 10_000 })

    // The From/To date inputs in the report filter bar get the period by default
    const dateInputs = page.locator('input[type="date"]')
    await expect(dateInputs.first()).not.toHaveValue('', { timeout: 10_000 })
    await expect(dateInputs.nth(1)).not.toHaveValue('', { timeout: 5_000 })
  })
})
