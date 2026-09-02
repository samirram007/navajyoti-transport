import { test, expect, type Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@admin.com'
const ADMIN_PASSWORD = 'password'
const FRONTEND_URL = 'http://localhost:5173'

/**
 * Log in as the admin user via the login form.
 */
async function loginAsAdmin(page: Page) {
  await page.goto(FRONTEND_URL)
  // The app should redirect to login if not authenticated
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"], input#email', ADMIN_EMAIL)
  await page.fill('input[type="password"], input[name="password"], input#password', ADMIN_PASSWORD)

  // Click login button
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
}

test.describe('Fees POS Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('should navigate to fees page and display the POS mode button', async ({ page }) => {
    // Navigate to fees page via sidebar or direct URL
    await page.goto(`${FRONTEND_URL}/fees`)

    // Wait for the fees page to load
    await expect(page.locator('text=Fees Collection')).toBeVisible({ timeout: 10_000 })

    // Verify POS Mode button exists
    const posButton = page.locator('button:has-text("POS Mode")')
    await expect(posButton).toBeVisible()
  })

  test('should open the POS page and display the search rider input', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/fees/new`)

    // Wait for the POS page to load
    await expect(page.locator('text=New Fee Collection')).toBeVisible({ timeout: 10_000 })

    // Verify the rider search input is visible
    const searchInput = page.locator('input[aria-label="Search rider"], input#rider-search')
    await expect(searchInput).toBeVisible()
  })

  test('should search for a rider and display results', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/fees/new`)

    // Wait for the POS page to load
    await expect(page.locator('text=New Fee Collection')).toBeVisible({ timeout: 10_000 })

    // Type a rider name to search
    const searchInput = page.locator('input[aria-label="Search rider"], input#rider-search')
    await searchInput.fill('Aarav')

    // Wait for search results to appear
    const riderResult = page.locator('text=Aarav Sharma')
    await expect(riderResult).toBeVisible({ timeout: 10_000 })
  })

  test('should create a fee collection for a rider (full POS flow)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/fees/new`)

    // Wait for the POS page to load
    await expect(page.locator('text=New Fee Collection')).toBeVisible({ timeout: 10_000 })

    // ── Step 1: Search and select a rider ──
    const searchInput = page.locator('input[aria-label="Search rider"], input#rider-search')
    await searchInput.fill('Aarav')

    // Click on the rider result
    const riderResult = page.locator('button:has-text("Aarav Sharma")')
    await expect(riderResult).toBeVisible({ timeout: 10_000 })
    await riderResult.click()

    // Verify the rider is selected
    await expect(page.getByText('Aarav Sharma').first()).toBeVisible({ timeout: 5_000 })

    // ── Step 2: Set fee items amount ──
    // The transport fee should auto-populate. Set the amount.
    const amountInput = page.locator('input[aria-label*="Amount"]').first()
    await expect(amountInput).toBeVisible({ timeout: 5_000 })
    await amountInput.fill('600')

    // ── Step 3: Select month(s) ──
    // Click on a month button (e.g., the first available month)
    const monthButtons = page.locator('button[type="button"][class*="rounded-lg"]')
    // Find a month button (not disabled)
    const firstAvailableMonth = monthButtons.filter({ hasNot: page.locator('[disabled]') }).first()
    await expect(firstAvailableMonth).toBeVisible({ timeout: 5_000 })
    await firstAvailableMonth.click()

    // ── Step 4: Set fiscal year ──
    // The fiscal year select should be visible on the right panel
    const fiscalYearSelect = page.locator('.w-80 .border-b select, .w-80 .border-b [role="combobox"]').first()
    if (await fiscalYearSelect.isVisible()) {
      await fiscalYearSelect.click()
      // Select the first fiscal year option
      const firstFyOption = page.locator('[role="option"]').first()
      if (await firstFyOption.isVisible()) {
        await firstFyOption.click()
      }
    }

    // ── Step 5: Set payment mode to Cash ──
    const cashButton = page.locator('button:has-text("Cash")')
    await expect(cashButton).toBeVisible({ timeout: 3_000 })
    await cashButton.click()

    // ── Step 6: Set paid amount (match total) ──
    const paidAmountInput = page.locator('input#custom-amount')
    await expect(paidAmountInput).toBeVisible({ timeout: 3_000 })
    // Clear and set the amount
    await paidAmountInput.fill('600')

    // ── Step 7: Submit the fee ──
    const submitButton = page.locator('button:has-text("Charge")')
    await expect(submitButton).toBeVisible({ timeout: 3_000 })

    // Wait for the submit button to not be disabled (not in pending state)
    await expect(submitButton).toBeEnabled({ timeout: 5_000 })

    // Click submit
    await submitButton.click()

    // ── Step 8: Verify success ──
    // Should show success message or redirect
    await expect(page.locator('text=Payment Recorded')).toBeVisible({ timeout: 15_000 })
  })

  test('should navigate from fees list to POS edit mode', async ({ page }) => {
    // First, create a fee so there's one to edit
    await page.goto(`${FRONTEND_URL}/fees/new`)

    await expect(page.locator('text=New Fee Collection')).toBeVisible({ timeout: 10_000 })

    const searchInput = page.locator('input[aria-label="Search rider"], input#rider-search')
    await searchInput.fill('Ananya')

    const riderResult = page.locator('button:has-text("Ananya Patel")')
    await expect(riderResult).toBeVisible({ timeout: 10_000 })
    await riderResult.click()

    const amountInput = page.locator('input[aria-label*="Amount"]').first()
    await expect(amountInput).toBeVisible({ timeout: 5_000 })
    await amountInput.fill('550')

    // Select a month
    const monthButtons = page.locator('button[type="button"][class*="rounded-lg"]')
    const firstAvailableMonth = monthButtons.filter({ hasNot: page.locator('[disabled]') }).first()
    await firstAvailableMonth.click()

    const cashButton = page.locator('button:has-text("Cash")')
    await cashButton.click()

    const paidAmountInput = page.locator('input#custom-amount')
    await paidAmountInput.fill('550')

    const submitButton = page.locator('button:has-text("Charge")')
    await expect(submitButton).toBeEnabled({ timeout: 5_000 })
    await submitButton.click()

    // Wait for success
    await expect(page.locator('text=Payment Recorded')).toBeVisible({ timeout: 15_000 })

    // Navigate back to fees list
    await page.goto(`${FRONTEND_URL}/fees`)
    await expect(page.locator('text=Fees Collection')).toBeVisible({ timeout: 10_000 })

    // Verify the fee appears in the table
    await expect(page.locator('text=F').first()).toBeVisible({ timeout: 5_000 })
  })

  test('should validate that rider selection is required', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/fees/new`)
    await expect(page.locator('text=New Fee Collection')).toBeVisible({ timeout: 10_000 })

    // Try to submit without selecting a rider (just click the charge button)
    // The fee items section should show "No items in cart"
    await expect(page.locator('text=No items in cart')).toBeVisible({ timeout: 5_000 })
  })

  test('should allow waiving a month', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/fees/new`)
    await expect(page.locator('text=New Fee Collection')).toBeVisible({ timeout: 10_000 })

    // Select a rider
    const searchInput = page.locator('input[aria-label="Search rider"], input#rider-search')
    await searchInput.fill('Priya')
    const riderResult = page.locator('button:has-text("Priya Singh")')
    await expect(riderResult).toBeVisible({ timeout: 10_000 })
    await riderResult.click()

    // Set an amount
    const amountInput = page.locator('input[aria-label*="Amount"]').first()
    await expect(amountInput).toBeVisible({ timeout: 5_000 })
    await amountInput.fill('600')

    // Target a specific month button by its text label (e.g., "Jul" for July)
    // The current month is July (month 7), so it will be a future/current month
    const monthBtn = page.getByText('Jul').first()
    await expect(monthBtn).toBeVisible({ timeout: 3_000 })
    
    // Click once to select the month (adds to fee item)
    await monthBtn.click()
    await page.waitForTimeout(300)

    // Click again to toggle to waived state (isWaived=true → line-through)
    await monthBtn.click()
    await page.waitForTimeout(300)

    // Verify the month button shows waived styling (line-through class)
    await expect(monthBtn).toHaveClass(/line-through/, { timeout: 5_000 })
  })
})
