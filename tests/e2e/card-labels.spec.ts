import { test, expect, Locator, Page } from '@playwright/test';

/**
 * Full Playwright spec for the card-labels feature.
 *
 * Drives the seeded demo@example.com / demo123 user through the architect's
 * 14-step flow. Each run creates its own dedicated board so the spec is
 * isolated from prior test artifacts and from the shared seed data.
 */

const STAMP = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const BOARD_NAME = `Card Labels E2E ${STAMP}`;
const BUG_NAME = `Bug-${STAMP}`;
const URGENT_NAME = `Urgent-${STAMP}`;
const RENAMED_NAME = `Defect-${STAMP}`;

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill('demo@example.com');
  await page.locator('input[type="password"]').fill('demo123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/boards', { timeout: 10000 });
}

async function createDedicatedBoard(page: Page) {
  await page.locator('[data-testid="create-board-button"]').click();
  const nameField = page.locator('[data-testid="create-board-name"]');
  // The shared Input component wraps the native <input>; resolve to the inner field.
  const innerInput = nameField.locator('input').first();
  const target = (await innerInput.count()) > 0 ? innerInput : nameField;
  await target.fill(BOARD_NAME);
  await page.locator('[data-testid="create-board-submit"]').click();
  await page.waitForURL(/\/boards\/[a-f0-9-]+/, { timeout: 10000 });
}

async function addList(page: Page, name: string) {
  const addListInput = page.locator('[data-testid="add-list-input"]');
  const innerInput = addListInput.locator('input').first();
  const target = (await innerInput.count()) > 0 ? innerInput : addListInput;
  await target.fill(name);
  await page.locator('[data-testid="add-list-button"]').click();
}

async function addCard(page: Page, title: string) {
  const addCardInput = page.locator('[data-testid="add-card-input"]').first();
  await addCardInput.fill(title);
  await page.locator('[data-testid="add-card-button"]').first().click();
}

async function createLabel(page: Page, name: string, colorSlot: string) {
  if (!(await page.locator('[data-testid="label-manager-modal"]').isVisible())) {
    await page.locator('[data-testid="manage-labels-button"]').click();
    await page.locator('[data-testid="label-manager-modal"]').waitFor({ state: 'visible' });
  }
  const nameInput = page.locator('[data-testid="label-create-name"]');
  const innerInput = nameInput.locator('input').first();
  const target = (await innerInput.count()) > 0 ? innerInput : nameInput;
  await target.fill(name);
  await page.locator(`[data-testid="label-swatch-create-${colorSlot}"]`).click();
  await page.locator('[data-testid="label-create-submit"]').click();
  const row = page
    .locator('[data-testid="label-manager-modal"] [data-testid^="label-row-"]')
    .filter({ hasText: name })
    .first();
  await row.waitFor({ state: 'visible', timeout: 5000 });
  return row;
}

async function getLabelId(row: Locator): Promise<string> {
  const testId = await row.getAttribute('data-testid');
  if (!testId) throw new Error('label row missing data-testid');
  return testId.replace(/^label-row-/, '');
}

async function closeOpenModal(page: Page) {
  await page.locator('[data-testid="modal-close"]').first().click();
}

test.describe('Card labels', () => {
  test('member can create, attach, filter, edit and delete labels end-to-end', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // 1. Login as the seeded demo user
    await login(page);

    // 2. Create a dedicated board for this run + populate with one list + two cards
    await createDedicatedBoard(page);
    await addList(page, 'To Do');
    await page.locator('[data-testid="column"]').first().waitFor({ state: 'visible' });
    await addCard(page, 'First card');
    await expect(page.locator('[data-testid="card-item"]')).toHaveCount(1, { timeout: 5000 });
    await addCard(page, 'Second card');
    await expect(page.locator('[data-testid="card-item"]')).toHaveCount(2, { timeout: 5000 });

    // 3. Click manage-labels-button -> manager modal opens
    await page.locator('[data-testid="manage-labels-button"]').click();
    await page.locator('[data-testid="label-manager-modal"]').waitFor({ state: 'visible' });

    // 4. Create the Bug label (red)
    const bugRow = await createLabel(page, BUG_NAME, 'red');
    const bugId = await getLabelId(bugRow);

    // 5. Create the Urgent label (amber)
    const urgentRow = await createLabel(page, URGENT_NAME, 'amber');
    const urgentId = await getLabelId(urgentRow);

    // 6. Close manager
    await closeOpenModal(page);
    await page.locator('[data-testid="label-manager-modal"]').waitFor({ state: 'hidden' });

    // 7. Open the first card -> CardModal opens
    const firstCard = page.locator('[data-testid="card-item"]').first();
    await firstCard.click();
    await page.locator('[data-testid="card-modal-add-label"]').waitFor({ state: 'visible' });

    // 8. Click + Add label -> picker popover opens
    await page.locator('[data-testid="card-modal-add-label"]').click();
    await page.locator('[data-testid="label-picker-popover"]').waitFor({ state: 'visible' });

    // 9. Click Bug + Urgent rows in the picker -> both attached
    await page.locator(`[data-testid="label-picker-row-${bugId}"]`).click();
    await expect(
      page.locator(`[data-testid="card-modal-label-${bugId}"]`),
    ).toBeVisible({ timeout: 5000 });

    await page.locator(`[data-testid="label-picker-row-${urgentId}"]`).click();
    await expect(
      page.locator(`[data-testid="card-modal-label-${urgentId}"]`),
    ).toBeVisible({ timeout: 5000 });

    // 10. Close the picker via outside click on the title input, then save+close the card modal.
    await page.locator('[data-testid="card-modal-title"]').click();
    await page.locator('[data-testid="label-picker-popover"]').waitFor({ state: 'hidden' });
    await page.locator('[data-testid="card-modal-save"]').click();
    await page.locator('[data-testid="modal-overlay"]').waitFor({ state: 'hidden', timeout: 10000 });

    const cardWithLabels = page
      .locator('[data-testid="card-item"]')
      .filter({ has: page.locator(`[data-testid="card-label-chip-${bugId}"]`) })
      .first();
    await cardWithLabels.waitFor({ state: 'visible', timeout: 5000 });
    await expect(cardWithLabels.locator('[data-testid="card-label-strip"]')).toBeVisible();
    await expect(
      cardWithLabels.locator(`[data-testid="card-label-chip-${bugId}"]`),
    ).toBeVisible();
    await expect(
      cardWithLabels.locator(`[data-testid="card-label-chip-${urgentId}"]`),
    ).toBeVisible();

    // 11. Click filter pill for Bug -> only cards with Bug remain
    await expect(page.locator('[data-testid="label-filter-bar"]')).toBeVisible();
    await page.locator(`[data-testid="filter-label-toggle-${bugId}"]`).click();

    // The card we tagged stays; the other (no labels) is filtered out.
    await expect(page.locator('[data-testid="card-item"]')).toHaveCount(1, { timeout: 5000 });
    await expect(
      page.locator(`[data-testid="card-label-chip-${bugId}"]`),
    ).toBeVisible();

    // 12. Click clear-label-filter -> all cards return
    await page.locator('[data-testid="clear-label-filter"]').click();
    await expect(page.locator('[data-testid="card-item"]')).toHaveCount(2, { timeout: 5000 });

    // 13. Reopen manager, edit Bug -> Defect; chip on the card now reads renamed value
    await page.locator('[data-testid="manage-labels-button"]').click();
    await page.locator('[data-testid="label-manager-modal"]').waitFor({ state: 'visible' });
    await page.locator(`[data-testid="label-edit-${bugId}"]`).click();

    const editInput = page.locator(`[data-testid="label-edit-name-${bugId}"]`);
    const editInner = editInput.locator('input').first();
    const editTarget = (await editInner.count()) > 0 ? editInner : editInput;
    await editTarget.fill(RENAMED_NAME);
    await page.locator(`[data-testid="label-edit-save-${bugId}"]`).click();

    await closeOpenModal(page);
    await page.locator('[data-testid="label-manager-modal"]').waitFor({ state: 'hidden' });

    const renamedChip = page.locator(`[data-testid="card-label-chip-${bugId}"]`).first();
    await expect(renamedChip).toBeVisible({ timeout: 5000 });
    await expect(renamedChip).toHaveAttribute('aria-label', `${RENAMED_NAME} label`);

    // 14. Delete the renamed label -> chip disappears from card and pill from filter bar
    await page.locator('[data-testid="manage-labels-button"]').click();
    await page.locator('[data-testid="label-manager-modal"]').waitFor({ state: 'visible' });
    await page.locator(`[data-testid="label-delete-${bugId}"]`).click();
    await page.locator(`[data-testid="label-delete-confirm-${bugId}"]`).click();

    await expect(page.locator(`[data-testid="label-row-${bugId}"]`)).toHaveCount(0, {
      timeout: 5000,
    });

    await closeOpenModal(page);
    await page.locator('[data-testid="label-manager-modal"]').waitFor({ state: 'hidden' });

    await expect(page.locator(`[data-testid="card-label-chip-${bugId}"]`)).toHaveCount(0, {
      timeout: 5000,
    });
    await expect(page.locator(`[data-testid="filter-label-toggle-${bugId}"]`)).toHaveCount(0);
  });
});
