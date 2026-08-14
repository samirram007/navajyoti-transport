import { test, expect, type Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@admin.com'
const ADMIN_PASSWORD = 'password'
const FRONTEND_URL = 'http://localhost:5173'

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
 * Click the ×N toggle button on the first expense item to enable multi-unit mode.
 * This reveals the hidden qty input so we can fill qty > 1.
 */
async function enableMultiUnit(page: Page) {
  const toggle = page.locator('button[title*="Enable multi-unit"]').first()
  await expect(toggle).toBeVisible({ timeout: 3_000 })
  await toggle.click()
  await page.waitForTimeout(200)
}

test.describe('Expenses POS Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('should navigate to expenses page and display the header', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/expenses`)
    await expect(page.locator('h1:has-text("Expenses")')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button:has-text("Add Expense")')).toBeVisible()
  })

  test('should navigate to create expense POS page and display auto-generated fields', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/expenses/new`)
    await expect(page.locator('text=New Expense').first()).toBeVisible({ timeout: 10_000 })

    // Right panel fields
    await expect(page.locator('label:has-text("Expense No")')).toBeVisible()
    await expect(page.locator('label:has-text("Voucher No")')).toBeVisible()
    await expect(page.locator('input#expense-no')).toBeVisible()
    await expect(page.locator('input#voucher-no')).toBeVisible()

    // Date input should be visible
    const dateInput = page.locator('input[type="date"]').first()
    await expect(dateInput).toBeVisible()
    const dateValue = await dateInput.inputValue()
    expect(dateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Verify auto-generated values
    const expenseNoValue = await page.locator('input#expense-no').inputValue()
    expect(expenseNoValue).toMatch(/^EXP-\d{8}-[A-Z0-9]{6}$/)

    const voucherNoValue = await page.locator('input#voucher-no').inputValue()
    expect(voucherNoValue).toMatch(/^VCH-\d{8}-[A-Z0-9]{6}$/)

    // Left panel sections
    await expect(page.locator('text=Quick Add Ledger')).toBeVisible()
    await expect(page.locator('button:has-text("Custom Item")')).toBeVisible()
    await expect(page.locator('h3:has-text("Expense Items")')).toBeVisible()
    await expect(page.locator('text=No expense items yet')).toBeVisible()

    // Right panel buttons
    await expect(page.locator('button:has-text("Paid")')).toBeVisible()
    await expect(page.locator('button:has-text("Cash")')).toBeVisible()

    // Submit button
    await expect(page.locator('button:has-text("Create Expense")')).toBeVisible()
  })

  test('should create expense via POS with quick-add ledger entry and verify via API', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/expenses/new`)
    await expect(page.locator('text=New Expense').first()).toBeVisible({ timeout: 10_000 })

    // ── Step 1: Select fiscal year ──
    const fyTrigger = page.locator('.w-80 button[aria-haspopup="listbox"]').first()
    if (await fyTrigger.isVisible()) {
      await fyTrigger.click()
      const fyOption = page.locator('[role="option"]').first()
      await expect(fyOption).toBeVisible({ timeout: 5_000 })
      await fyOption.click()
      await page.waitForTimeout(300)
    }

    // ── Step 2: Add ledger entry via quick-add ──
    const firstGroup = page.locator('button:has-text("Fuel")').first()
    await expect(firstGroup).toBeVisible({ timeout: 5_000 })
    await firstGroup.click()
    await page.waitForTimeout(300)

    // Click on a head within the expanded group (e.g., "Diesel")
    const dieselBtn = page.locator('button:has-text("Diesel")').first()
    await expect(dieselBtn).toBeVisible({ timeout: 3_000 })
    await dieselBtn.click()
    await page.waitForTimeout(300)

    // Item should be in the cart
    await expect(page.locator('text=Diesel').first()).toBeVisible({ timeout: 3_000 })

    // ── Step 3: Enable multi-unit mode (qty toggle) and set qty + amount ──
    await enableMultiUnit(page)
    const numberInputs = page.locator('input[type="number"]')
    // After toggling multi-unit, first number input is qty, second is amount
    await numberInputs.first().fill('50')
    await numberInputs.nth(1).fill('80')
    await page.waitForTimeout(200)

    // Verify total updates
    await expect(page.locator('text=₹4,000').first()).toBeVisible()

    // ── Step 4: Add another item via Custom Item ──
    await page.locator('button:has-text("Custom Item")').click()
    await page.waitForTimeout(300)

    // For custom items, native <select> elements appear
    const selects = page.locator('select')
    await expect(selects.first()).toBeVisible({ timeout: 3_000 })

    // Select Maintenance group
    await selects.first().selectOption({ label: 'Maintenance' })
    await page.waitForTimeout(200)

    // Head select should now be enabled
    await expect(selects.nth(1)).toBeEnabled({ timeout: 3_000 })
    await selects.nth(1).selectOption({ label: 'Engine Repair' })
    await page.waitForTimeout(200)

    // Set description, qty and amount
    const descInputs = page.locator('input[placeholder="Enter description..."]')
    await descInputs.last().fill('Oil change & filter')

    // For the second item (flat amount, qty=1), just fill the amount
    // After enabling multi-unit on item 1, we have 2 number inputs visible.
    // Item 2 has qty=1 (hidden), so only its amount input is added.
    // So numberInputs: [item1-qty, item1-amount, item2-amount]
    const allNumberInputs = page.locator('input[type="number"]')
    await allNumberInputs.nth(2).fill('1200')
    await page.waitForTimeout(200)

    // ── Step 5: Set note ──
    await page.locator('input#expense-note').fill('E2E POS multi-ledger test')

    // Read auto-generated values
    const generatedExpenseNo = await page.locator('input#expense-no').inputValue()
    const generatedVoucherNo = await page.locator('input#voucher-no').inputValue()
    expect(generatedExpenseNo).toMatch(/^EXP-\d{8}-[A-Z0-9]{6}$/)
    expect(generatedVoucherNo).toMatch(/^VCH-\d{8}-[A-Z0-9]{6}$/)

    // Verify total on right panel is ₹5,200
    await expect(page.locator('text=₹5,200').first()).toBeVisible()

    // ── Step 6: Intercept the POST request ──
    const postPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/expenses') && resp.request().method() === 'POST',
    )

    // Submit
    await page.locator('button:has-text("Create Expense")').click()
    await expect(page.getByText('Expense Created!').first()).toBeVisible({ timeout: 15_000 })

    // Verify POST payload
    const postResp = await postPromise
    const postBody = JSON.parse(postResp.request().postData() || '{}')

    expect(postBody.expenseNo).toBe(generatedExpenseNo)
    expect(postBody.voucherNo).toBe(generatedVoucherNo)
    expect(postBody.totalAmount).toBe(5200)
    expect(postBody.paymentMode).toBe('cash')
    expect(postBody.note).toBe('E2E POS multi-ledger test')
    expect(postBody.expenseItems).toHaveLength(2)

    const [item1, item2] = postBody.expenseItems
    expect(item1.quantity).toBe(50)
    expect(item1.amount).toBe(80)
    expect(item1.totalAmount).toBe(4000)

    expect(item2.quantity).toBe(1)
    expect(item2.amount).toBe(1200)
    expect(item2.totalAmount).toBe(1200)

    // ── Step 7: Success buttons ──
    await expect(page.locator('button:has-text("New Expense")')).toBeVisible()
    await expect(page.locator('button:has-text("Print")')).toBeVisible()
    await expect(page.locator('button:has-text("Edit")')).toBeVisible()
  })

  test('should create expense and be able to edit it via the edit route', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/expenses/new`)
    await expect(page.locator('text=New Expense').first()).toBeVisible({ timeout: 10_000 })

    // ── Step 1: Select fiscal year ──
    const fyTrigger = page.locator('.w-80 button[aria-haspopup="listbox"]').first()
    if (await fyTrigger.isVisible()) {
      await fyTrigger.click()
      const fyOption = page.locator('[role="option"]').first()
      await expect(fyOption).toBeVisible({ timeout: 5_000 })
      await fyOption.click()
      await page.waitForTimeout(300)
    }

    // ── Step 2: Add ledger item via quick-add ──
    const adminGroup = page.locator('button:has-text("Administrative")').first()
    await expect(adminGroup).toBeVisible({ timeout: 5_000 })
    await adminGroup.click()
    await page.waitForTimeout(300)

    const insuranceBtn = page.locator('button:has-text("Insurance")').first()
    await expect(insuranceBtn).toBeVisible({ timeout: 3_000 })
    await insuranceBtn.click()
    await page.waitForTimeout(200)

    // For flat amount (insurance premium), just fill the amount input
    // qty stays at 1 (hidden), so only 1 number input is visible
    const numberInputs = page.locator('input[type="number"]')
    await numberInputs.first().fill('5000')
    await page.waitForTimeout(200)

    // Set description
    const descInput = page.locator('input[placeholder="Enter description..."]').first()
    await descInput.fill('Insurance premium')

    // Set payment mode to Bank Transfer
    await page.locator('button:has-text("Transfer")').click()
    await page.waitForTimeout(100)

    // Set status to Pending
    await page.locator('button:has-text("Pending")').click()
    await page.waitForTimeout(100)

    // Set note
    await page.locator('input#expense-note').fill('E2E POS edit test')

    const generatedExpenseNo = await page.locator('input#expense-no').inputValue()
    const generatedVoucherNo = await page.locator('input#voucher-no').inputValue()

    // Intercept POST
    const postPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/expenses') && resp.request().method() === 'POST',
    )

    await page.locator('button:has-text("Create Expense")').click()
    await expect(page.getByText('Expense Created!').first()).toBeVisible({ timeout: 15_000 })

    // Verify POST payload
    const postResp = await postPromise
    const postBody = JSON.parse(postResp.request().postData() || '{}')
    expect(postBody.expenseNo).toBe(generatedExpenseNo)
    expect(postBody.voucherNo).toBe(generatedVoucherNo)
    expect(postBody.totalAmount).toBe(5000)
    expect(postBody.paymentMode).toBe('bank_transfer')

    // ── Step 3: Navigate to expenses list and search ──
    await page.goto(`${FRONTEND_URL}/expenses`)
    await expect(page.locator('h1:has-text("Expenses")')).toBeVisible({ timeout: 10_000 })

    // Search by expense no
    const searchInput = page.locator('input[placeholder="Search all fields..."]')
    const searchPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/expenses') &&
      resp.request().method() === 'GET' &&
      resp.url().includes(`search=${encodeURIComponent(generatedExpenseNo)}`),
    )

    await searchInput.fill(generatedExpenseNo)
    const searchResp = await searchPromise
    const searchBody = await searchResp.json()
    expect(searchBody.data?.length).toBeGreaterThanOrEqual(1)

    // ── Step 4: Click edit button ──
    const editButton = page.locator('table button:has(svg.lucide-pencil)').first()
    await expect(editButton).toBeVisible({ timeout: 5_000 })
    await editButton.click()

    // Verify edit page with loaded data
    await expect(page).toHaveURL(/\/expenses\/\d+\/edit/, { timeout: 10_000 })
    await expect(page.locator('text=Edit Expense').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('input#expense-no')).toHaveValue(generatedExpenseNo, { timeout: 5_000 })
    await expect(page.locator('input#voucher-no')).toHaveValue(generatedVoucherNo, { timeout: 5_000 })

    const dateInput = page.locator('input[type="date"]').first()
    const dateValue = await dateInput.inputValue()
    expect(dateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('should go back to expenses list using the Back button', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/expenses/new`)
    await expect(page.locator('text=New Expense').first()).toBeVisible({ timeout: 10_000 })

    // Click the Back button
    await page.locator('button:has-text("Back")').click()
    await expect(page).toHaveURL(/\/expenses\/?$/, { timeout: 5_000 })
  })

  test('should validate that at least one expense item is required', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/expenses/new`)
    await expect(page.locator('text=New Expense').first()).toBeVisible({ timeout: 10_000 })

    // Try to submit without any items
    await page.locator('button:has-text("Create Expense")').click()
    await expect(page.locator('text=Please add at least one expense item')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=At least one expense item is required')).toBeVisible()
  })

  test('should add custom item with group/head selects and submit', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/expenses/new`)
    await expect(page.locator('text=New Expense').first()).toBeVisible({ timeout: 10_000 })

    // Use Custom Item button to add an item
    await page.locator('button:has-text("Custom Item")').click()
    await page.waitForTimeout(300)

    // Native select elements appear for group and head
    const selects = page.locator('select')
    await expect(selects.first()).toBeVisible({ timeout: 3_000 })

    // Select Fuel group
    await selects.first().selectOption({ label: 'Fuel' })
    await page.waitForTimeout(200)

    // Head select should now be enabled - select Petrol
    await selects.nth(1).selectOption({ label: 'Petrol' })
    await page.waitForTimeout(200)

    // For flat amount (qty=1 hidden), just fill the single visible amount input
    const numberInputs = page.locator('input[type="number"]')
    await numberInputs.first().fill('900')
    await page.waitForTimeout(200)

    // Verify total
    await expect(page.locator('text=₹900').first()).toBeVisible()

    // Submit
    const postPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/expenses') && resp.request().method() === 'POST',
    )
    await page.locator('button:has-text("Create Expense")').click()
    await expect(page.getByText('Expense Created!').first()).toBeVisible({ timeout: 15_000 })

    const postResp = await postPromise
    const postBody = JSON.parse(postResp.request().postData() || '{}')
    expect(postBody.expenseItems).toHaveLength(1)
    expect(postBody.totalAmount).toBe(900)

    // Since qty=1 (default), amount=900, total=900
    expect(postBody.expenseItems[0].quantity).toBe(1)
    expect(postBody.expenseItems[0].amount).toBe(900)
    expect(postBody.expenseItems[0].totalAmount).toBe(900)
  })
})
