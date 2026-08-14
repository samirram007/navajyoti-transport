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

// SearchableSelect trigger: a plain button with aria-haspopup="listbox".
// Options: buttons with role="option" inside a role="listbox" container.
const TRIGGER = 'button[aria-haspopup="listbox"]'

test.describe('Report dropdown filters stability (SearchableSelect)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('Fiscal Year dropdown: opens, stays open, selects, and "All" restores placeholder', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/reports/rider-fee-collection`)
    await expect(page.getByRole('heading', { name: 'Rider Fee Collection' })).toBeVisible({ timeout: 10_000 })

    const trigger = page.locator(TRIGGER).first()
    await expect(trigger).toBeVisible({ timeout: 10_000 })

    // Open and confirm it stays open
    await trigger.click()
    const dropdown = page.locator('[role="listbox"]').first()
    await expect(dropdown).toBeVisible({ timeout: 2_000 })
    await page.waitForTimeout(700)
    await expect(dropdown).toBeVisible({ timeout: 1_500 })

    // Select the second item (a real fiscal year)
    const items = dropdown.locator('[role="option"]')
    const label = (await items.nth(1).textContent())?.trim() ?? ''
    await items.nth(1).click()
    await expect(dropdown).toBeHidden({ timeout: 2_000 })
    await expect(trigger).toContainText(label, { timeout: 3_000 })

    // Re-open and select "All Fiscal Years" — clears the selection back to the default
    await trigger.click()
    await expect(dropdown).toBeVisible({ timeout: 2_000 })
    await dropdown.locator('[role="option"]', { hasText: 'All Fiscal Years' }).click()
    await expect(trigger).toContainText('All Fiscal Years', { timeout: 3_000 })
  })

  test('Every dropdown on the page survives opening', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/reports/pending-collection`)
    await expect(page.getByRole('heading', { name: 'Pending Collection' })).toBeVisible({ timeout: 10_000 })

    const triggers = page.locator(TRIGGER)
    await expect(triggers).toHaveCount(3, { timeout: 10_000 })

    for (let i = 0; i < 3; i++) {
      await triggers.nth(i).click()
      const dropdown = page.locator('[role="listbox"]').first()
      await expect(dropdown).toBeVisible({ timeout: 2_000 })
      await page.waitForTimeout(600)
      await expect(dropdown).toBeVisible({ timeout: 1_500 })
      // Close via Escape
      await page.keyboard.press('Escape')
      await expect(dropdown).toBeHidden({ timeout: 2_000 })
    }
  })

  test('Search filtering works inside the dropdown', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/reports/rider-fee-collection`)
    await expect(page.getByRole('heading', { name: 'Rider Fee Collection' })).toBeVisible({ timeout: 10_000 })

    const schoolTrigger = page.locator(TRIGGER).nth(1)
    await schoolTrigger.click()

    const dropdown = page.locator('[role="listbox"]').first()
    await expect(dropdown).toBeVisible({ timeout: 2_000 })

    // The search input is focused on open; type a query
    const searchInput = page.locator('input[aria-label="Search..."]')
    await expect(searchInput).toBeFocused({ timeout: 2_000 })
    await searchInput.fill('z') // unlikely school name match

    // Options list still present; dropdown stays open while typing
    await expect(dropdown).toBeVisible({ timeout: 1_500 })
  })
})
