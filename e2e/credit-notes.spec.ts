import { test, expect, type Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@admin.com'
const ADMIN_PASSWORD = 'password'
const FRONTEND_URL = 'http://localhost:5173'
const RIDER_NAME = 'FILZA ADIL'
const NOTE1 = `CN-E2E-${Date.now()}`
const NOTE2 = `CN-E2E-${Date.now()}-apply`

/**
 * Log in as the admin user via the login form.
 */
async function loginAsAdmin(page: Page) {
  await page.goto(FRONTEND_URL)
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  await page.fill('input[type="email"], input[name="email"], input#email', ADMIN_EMAIL)
  await page.fill('input[type="password"], input[name="password"], input#password', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
}

/**
 * Open the Fees POS, select the rider, set the amount + July + a note.
 */
async function openPosForRider(page: Page, note: string) {
  await page.goto(`${FRONTEND_URL}/fees/new`)
  await expect(page.locator('text=New Fee Collection')).toBeVisible({ timeout: 10_000 })

  // Open the rider dropdown first — the search input only renders while open
  const trigger = page.locator('[role="button"]', { hasText: 'Search rider by name...' }).first()
  await expect(trigger).toBeVisible({ timeout: 5_000 })
  await trigger.click()

  const searchInput = page.locator('input[aria-label="Search rider"], input#rider-search')
  await expect(searchInput).toBeVisible({ timeout: 5_000 })
  await searchInput.fill('FILZA')

  const riderResult = page.locator(`button:has-text("${RIDER_NAME}")`)
  await expect(riderResult).toBeVisible({ timeout: 10_000 })
  await riderResult.click()
  await expect(page.getByText(RIDER_NAME).first()).toBeVisible({ timeout: 5_000 })

  const amountInput = page.locator('input[aria-label*="Amount"]').first()
  await expect(amountInput).toBeVisible({ timeout: 5_000 })
  await amountInput.fill('600')

  const julBtn = page.getByText('Jul').first()
  await expect(julBtn).toBeVisible({ timeout: 5_000 })
  await julBtn.click()

  await page.fill('input#fee-note', note)
}

test.describe('Credit note flow (cancel → credit note → adjust in POS)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('cancelling a paid fee creates a credit note, then the credit is applied against a new fee', async ({ page }) => {
    // ── 1. Create a paid fee (₹600, July) with a unique note ──
    await openPosForRider(page, NOTE1)

    const submitButton = page.locator('button:has-text("Charge")')
    await expect(submitButton).toBeEnabled({ timeout: 5_000 })
    await submitButton.click()
    await expect(page.locator('text=Payment Recorded')).toBeVisible({ timeout: 15_000 })

    // ── 2. Cancel the voucher from the fees list ──
    await page.goto(`${FRONTEND_URL}/fees`)
    await expect(page.getByRole('heading', { name: 'Fees Collection' })).toBeVisible({ timeout: 10_000 })

    const feeRow = page.locator('tr', { hasText: NOTE1 }).first()
    await expect(feeRow).toBeVisible({ timeout: 10_000 })
    await feeRow.locator('button[title="Cancel voucher"]').click()

    const confirmBtn = page.locator('button:has-text("Yes, Cancel Voucher")')
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 })
    await confirmBtn.click()

    // Toast confirms the credit note
    await expect(page.locator('text=credit note').first()).toBeVisible({ timeout: 10_000 })

    // ── 3. This run's credit note is the newest row: Open with ₹600 balance ──
    await page.goto(`${FRONTEND_URL}/credit-notes`)
    await expect(page.getByRole('heading', { name: 'Credit Notes' })).toBeVisible({ timeout: 10_000 })

    const cnRow = page.locator('tr', { hasText: RIDER_NAME }).first()
    await expect(cnRow).toBeVisible({ timeout: 10_000 })
    await expect(cnRow.locator('text=Open')).toBeVisible({ timeout: 5_000 })
    await expect(cnRow.locator('text=600').first()).toBeVisible({ timeout: 5_000 })

    // ── 4. Adjust the credit in the POS against a new fee ──
    await openPosForRider(page, NOTE2)

    // Available credit is shown once the rider is selected
    await expect(page.locator('text=Available:')).toBeVisible({ timeout: 10_000 })

    // Apply All → credit covers the full amount
    await page.locator('button:has-text("Apply All")').click()
    await expect(page.locator('input#credit-amount')).toHaveValue('600', { timeout: 5_000 })

    // Cash to collect is 0 but the fee can still be submitted (credit covers it)
    const submitButton2 = page.locator('button:has-text("Charge")')
    await expect(submitButton2).toBeEnabled({ timeout: 5_000 })
    await submitButton2.click()
    await expect(page.locator('text=Payment Recorded')).toBeVisible({ timeout: 15_000 })

    // ── 5. Some credit note for the rider is now fully used ──
    await page.goto(`${FRONTEND_URL}/credit-notes`)
    await expect(page.getByRole('heading', { name: 'Credit Notes' })).toBeVisible({ timeout: 10_000 })

    const usedRow = page.locator('tr', { hasText: RIDER_NAME }).filter({ hasText: 'Used' }).first()
    await expect(usedRow).toBeVisible({ timeout: 5_000 })

    // ── 6. Cleanup: cancel the credit-paid fee (refunds the credit, frees July) ──
    await page.goto(`${FRONTEND_URL}/fees`)
    await expect(page.getByRole('heading', { name: 'Fees Collection' })).toBeVisible({ timeout: 10_000 })

    const applyRow = page.locator('tr', { hasText: NOTE2 }).first()
    await expect(applyRow).toBeVisible({ timeout: 10_000 })
    await applyRow.locator('button[title="Cancel voucher"]').click()
    await expect(page.locator('button:has-text("Yes, Cancel Voucher")')).toBeVisible({ timeout: 5_000 })
    await page.locator('button:has-text("Yes, Cancel Voucher")').click()
    await expect(page.locator('text=Voucher cancelled successfully').first()).toBeVisible({ timeout: 10_000 })
  })

  test('cancelling a paid fee WITHOUT a credit note writes off the payment', async ({ page }) => {
    const NOTE = `NO-CN-E2E-${Date.now()}`

    // ── 1. Create a paid fee (₹600, July) ──
    await openPosForRider(page, NOTE)

    const submitButton = page.locator('button:has-text("Charge")')
    await expect(submitButton).toBeEnabled({ timeout: 5_000 })
    await submitButton.click()
    await expect(page.locator('text=Payment Recorded')).toBeVisible({ timeout: 15_000 })

    // ── 2. Cancel it, unchecking the credit note option ──
    await page.goto(`${FRONTEND_URL}/fees`)
    await expect(page.getByRole('heading', { name: 'Fees Collection' })).toBeVisible({ timeout: 10_000 })

    const feeRow = page.locator('tr', { hasText: NOTE }).first()
    await expect(feeRow).toBeVisible({ timeout: 10_000 })
    await feeRow.locator('button[title="Cancel voucher"]').click()

    const creditCheckbox = page.locator('button[role="checkbox"]', { hasText: 'Create a credit note' })
    await expect(creditCheckbox).toBeVisible({ timeout: 5_000 })
    await expect(creditCheckbox).toHaveAttribute('aria-checked', 'true')
    await creditCheckbox.click() // opt out
    await expect(creditCheckbox).toHaveAttribute('aria-checked', 'false')

    await page.locator('button:has-text("Yes, Cancel Voucher")').click()

    // ── 3. The toast must NOT mention a credit note ──
    await expect(page.locator('text=Voucher cancelled successfully').first()).toBeVisible({ timeout: 10_000 })
    const toasts = page.locator('[data-sonner-toast]')
    await expect(toasts.filter({ hasText: 'credit note' })).toHaveCount(0, { timeout: 3_000 })

    // ── 4. The cancelled voucher can be seen but NOT edited ──
    const cancelledRow = page.locator('tr', { hasText: NOTE }).first()
    await expect(cancelledRow).toBeVisible({ timeout: 5_000 })
    await expect(cancelledRow.locator('button[title="Cannot edit a cancelled voucher"]')).toBeDisabled({ timeout: 5_000 })
  })
})
