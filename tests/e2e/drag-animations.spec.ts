import { test, expect, Page } from '@playwright/test';

/**
 * Phase 3 E2E for drag-and-drop with animations.
 *
 * Drives the seeded demo@example.com / demo123 user through a dedicated board.
 * Tests within-list reorder (AC #1), cross-list move (AC #2), Escape-to-cancel
 * (AC #4), and click-still-opens-modal (AC #8). Persistence after reload is
 * asserted for both pointer-drag flows (AC #6).
 */

const STAMP = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const BOARD_NAME = `Drag E2E ${STAMP}`;
const LIST_TODO = `To Do ${STAMP}`;
const LIST_DONE = `Done ${STAMP}`;

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

async function addCardToList(page: Page, listIndex: number, title: string) {
  const columns = page.locator('[data-testid="column"]');
  const input = columns.nth(listIndex).locator('[data-testid="add-card-input"]');
  const button = columns.nth(listIndex).locator('[data-testid="add-card-button"]');
  await input.fill(title);
  await button.click();
  // Wait for the new card to appear in that column.
  await expect(
    columns.nth(listIndex).locator('[data-testid="card-item"]').filter({ hasText: title }),
  ).toBeVisible({ timeout: 5000 });
}

async function getCardTitlesInColumn(page: Page, columnIndex: number): Promise<string[]> {
  const cards = page
    .locator('[data-testid="column"]')
    .nth(columnIndex)
    .locator('[data-testid="card-item"]');
  return cards.allInnerTexts();
}

/**
 * Drag-and-drop a card by simulating mouse events. dnd-kit's PointerSensor
 * activation distance is 6px (see BoardView.tsx) so we move past that threshold
 * in steps to trigger the drag lifecycle, then land on the target element.
 */
async function dragCardTo(page: Page, source: ReturnType<Page['locator']>, target: ReturnType<Page['locator']>) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('source/target bounding box unavailable');

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Nudge past the 6px activation distance in two steps so dnd-kit starts the drag.
  await page.mouse.move(sx + 10, sy + 10, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.mouse.up();
}

test.describe('Card drag-and-drop', () => {
  test('member can reorder within a list, move across lists, cancel with Escape, and still click to open modal', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // 1. Login and spin up a fresh board with two lists + cards.
    await login(page);
    await createDedicatedBoard(page);
    await addList(page, LIST_TODO);
    await addList(page, LIST_DONE);
    await expect(page.locator('[data-testid="column"]')).toHaveCount(2, { timeout: 5000 });

    await addCardToList(page, 0, 'Card Alpha');
    await addCardToList(page, 0, 'Card Beta');
    await addCardToList(page, 0, 'Card Gamma');

    // 2. Within-list reorder: drag Gamma above Alpha.
    const columns = page.locator('[data-testid="column"]');
    let todoCards = columns.nth(0).locator('[data-testid="card-item"]');
    await expect(todoCards).toHaveCount(3);

    const gammaCard = todoCards.filter({ hasText: 'Card Gamma' }).first();
    const alphaCard = todoCards.filter({ hasText: 'Card Alpha' }).first();
    await dragCardTo(page, gammaCard, alphaCard);

    // After drop, expect Gamma to be the first card in column 0.
    await expect(async () => {
      const titles = await getCardTitlesInColumn(page, 0);
      expect(titles[0]).toContain('Card Gamma');
    }).toPass({ timeout: 5000 });

    // 3. Persistence: reload the page and verify order survives.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="column"]').nth(0).locator('[data-testid="card-item"]')).toHaveCount(3, {
      timeout: 10000,
    });
    const afterReloadTitles = await getCardTitlesInColumn(page, 0);
    expect(afterReloadTitles[0]).toContain('Card Gamma');

    // 4. Cross-list move: drag Gamma from To-Do onto the empty drop-zone of Done.
    todoCards = columns.nth(0).locator('[data-testid="card-item"]');
    const movingCard = todoCards.filter({ hasText: 'Card Gamma' }).first();
    const emptyDrop = columns.nth(1).locator('[data-testid^="column-empty-drop-"]');
    await expect(emptyDrop).toBeVisible();
    await dragCardTo(page, movingCard, emptyDrop);

    // Gamma should now be in Done, and no longer in To-Do.
    await expect(async () => {
      const doneTitles = await getCardTitlesInColumn(page, 1);
      expect(doneTitles.join(' ')).toContain('Card Gamma');
      const todoTitles = await getCardTitlesInColumn(page, 0);
      expect(todoTitles.join(' ')).not.toContain('Card Gamma');
    }).toPass({ timeout: 5000 });

    // 5. Persistence across reload for the cross-list move.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="column"]').nth(1).locator('[data-testid="card-item"]'),
    ).toHaveCount(1, { timeout: 10000 });
    const doneTitlesAfterReload = await getCardTitlesInColumn(page, 1);
    expect(doneTitlesAfterReload.join(' ')).toContain('Card Gamma');

    // 6. Escape cancels a drag without issuing a PATCH. Track /api/cards/* PATCH
    //    requests during the attempt and assert none are sent.
    const patchRequests: string[] = [];
    const requestListener = (req: import('@playwright/test').Request) => {
      if (req.method() === 'PATCH' && /\/api\/cards\//.test(req.url())) {
        patchRequests.push(req.url());
      }
    };
    page.on('request', requestListener);

    const alphaCardAfter = columns.nth(0).locator('[data-testid="card-item"]').filter({ hasText: 'Card Alpha' }).first();
    const alphaBox = await alphaCardAfter.boundingBox();
    if (!alphaBox) throw new Error('alpha bounding box missing');
    await page.mouse.move(alphaBox.x + alphaBox.width / 2, alphaBox.y + alphaBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(alphaBox.x + 30, alphaBox.y + 30, { steps: 5 });
    await page.mouse.move(alphaBox.x + 100, alphaBox.y + 100, { steps: 10 });
    await page.keyboard.press('Escape');
    await page.mouse.up();

    // Give the client a moment to fire any inflight request (there should be none).
    await page.waitForTimeout(300);
    expect(patchRequests).toEqual([]);
    page.off('request', requestListener);

    // 7. Clicking a card (release under activation distance) still opens the modal.
    await columns.nth(0).locator('[data-testid="card-item"]').filter({ hasText: 'Card Alpha' }).first().click();
    await expect(page.locator('[data-testid="card-modal-title"]')).toBeVisible({ timeout: 5000 });
  });
});
