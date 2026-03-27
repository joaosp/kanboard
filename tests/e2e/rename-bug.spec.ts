import { test, expect } from '@playwright/test';

test('cards persist after renaming board', async ({ page }) => {
  // Login as admin
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('admin@example.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/boards', { timeout: 5000 });

  // Go to first board
  await page.locator('[data-testid="board-card"]').first().waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('[data-testid="board-card"]').first().click();
  await page.waitForTimeout(2000);
  await page.locator('[data-testid="column"]').first().waitFor({ state: 'visible', timeout: 5000 });

  // Count columns and cards before
  const colsBefore = await page.locator('[data-testid="column"]').count();
  const cardsBefore = await page.locator('[data-testid="card-item"]').count();
  await page.screenshot({ path: 'test-results/rename-01-before.png', fullPage: true });

  expect(colsBefore).toBeGreaterThan(0);
  expect(cardsBefore).toBeGreaterThan(0);

  // Rename the board
  await page.locator('[data-testid="edit-board-name"]').click();
  await page.waitForTimeout(300);
  const input = page.locator('[data-testid="board-name-input"]');
  await input.clear();
  await input.fill('Renamed For Test');
  await input.press('Enter');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/rename-02-after.png', fullPage: true });

  // Verify name changed
  await expect(page.locator('[data-testid="board-name"]')).toContainText('Renamed For Test');

  // Verify columns and cards are still there
  const colsAfter = await page.locator('[data-testid="column"]').count();
  const cardsAfter = await page.locator('[data-testid="card-item"]').count();

  expect(colsAfter).toBe(colsBefore);
  expect(cardsAfter).toBe(cardsBefore);

  // Restore name
  await page.locator('[data-testid="edit-board-name"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="board-name-input"]').clear();
  await page.locator('[data-testid="board-name-input"]').fill('Project Alpha');
  await page.locator('[data-testid="board-name-input"]').press('Enter');
  await page.waitForTimeout(1000);
});
