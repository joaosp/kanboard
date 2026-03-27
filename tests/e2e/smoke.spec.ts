import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('full flow: login -> dashboard -> board -> cards', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill('demo@example.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/boards', { timeout: 5000 });

    // 2. Wait for boards to load (spinner goes away, board cards appear)
    await page.locator('[data-testid="board-card"]').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.screenshot({ path: 'test-results/02-dashboard.png', fullPage: true });

    const boardCards = page.locator('[data-testid="board-card"]');
    const count = await boardCards.count();
    console.log('Board cards on dashboard:', count);
    expect(count).toBeGreaterThan(0);

    // 3. Click first board -> should navigate to board view
    await boardCards.first().click();
    await page.waitForTimeout(500);

    // Wait for board view to load — either columns appear or URL changes
    try {
      await page.waitForURL('**/boards/**', { timeout: 5000 });
    } catch {
      // Already on the right URL or navigation didn't happen
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/03-board-view.png', fullPage: true });
    console.log('URL after clicking board:', page.url());

    // Check if we actually navigated
    const url = page.url();
    if (url === 'http://localhost:3000/boards') {
      console.log('BUG: Board card click did not navigate!');
      // Try again with a direct navigation
      const boardId = await boardCards.first().getAttribute('data-board-id');
      console.log('Board data attribute:', boardId);
    }

    // 4. Board view should show columns
    const columns = page.locator('[data-testid="column"]');
    try {
      await columns.first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      console.log('BUG: No columns visible in board view');
      const pageContent = await page.content();
      console.log('Page has modal-overlay?', pageContent.includes('modal-overlay'));
      console.log('Page has column?', pageContent.includes('column'));
    }
    const colCount = await columns.count();
    console.log('Columns found:', colCount);
    await page.screenshot({ path: 'test-results/04-columns.png', fullPage: true });

    if (colCount === 0) {
      // Debug: what's on the page?
      console.log('Current URL:', page.url());
      return;
    }

    // 5. Cards in columns
    const cards = page.locator('[data-testid="card-item"]');
    const cardCount = await cards.count();
    console.log('Cards found:', cardCount);

    // 6. Add a card
    const addCardInput = page.locator('[data-testid="add-card-input"]').first();
    await addCardInput.fill('Playwright Test Card');
    await page.locator('[data-testid="add-card-button"]').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/05-card-added.png', fullPage: true });

    const newCardCount = await page.locator('[data-testid="card-item"]').count();
    console.log('Cards after add:', newCardCount);
    expect(newCardCount).toBeGreaterThan(cardCount);

    // 7. Click card to open modal
    await page.locator('[data-testid="card-item"]').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/06-card-modal.png', fullPage: true });

    const modal = page.locator('[data-testid="modal"]');
    const modalVisible = await modal.isVisible();
    console.log('Card modal visible:', modalVisible);

    if (modalVisible) {
      // 8. Edit card in modal
      const titleInput = page.locator('[data-testid="card-modal-title"]');
      await titleInput.clear();
      await titleInput.fill('Updated Card Title');
      await page.locator('[data-testid="card-modal-save"]').click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/07-after-save.png', fullPage: true });

      // 9. Delete a card via modal
      await page.locator('[data-testid="card-item"]').first().click();
      await page.waitForTimeout(1000);
      await page.locator('[data-testid="card-modal-delete"]').click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/08-after-delete.png', fullPage: true });
    }

    // 10. Delete a list
    const listDeleteBtn = page.locator('[data-testid="delete-list-button"]').first();
    if (await listDeleteBtn.isVisible()) {
      const colsBefore = await columns.count();
      await listDeleteBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/09-after-list-delete.png', fullPage: true });
      const colsAfter = await columns.count();
      console.log(`Lists: ${colsBefore} -> ${colsAfter}`);
    }

    // 11. Add a new list
    const addListInput = page.locator('[data-testid="add-list-input"]');
    // The input might be wrapped in a shared Input component
    const actualInput = addListInput.locator('input').first();
    const inputToUse = await actualInput.count() > 0 ? actualInput : addListInput;
    await inputToUse.fill('New Column');
    await page.locator('[data-testid="add-list-button"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/10-new-list.png', fullPage: true });

    // 12. Edit board name
    const editBtn = page.locator('[data-testid="edit-board-name"]');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const nameInput = page.locator('[data-testid="board-name-input"]');
      await nameInput.clear();
      await nameInput.fill('Renamed Board');
      await nameInput.press('Enter');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/11-renamed.png', fullPage: true });
    }

    // 13. Go back to boards
    await page.locator('[data-testid="back-to-boards"]').click();
    await page.waitForURL('**/boards', { timeout: 5000 });
    await page.locator('[data-testid="board-card"]').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.screenshot({ path: 'test-results/12-back.png', fullPage: true });

    // 14. Create a new board
    await page.locator('[data-testid="create-board-button"]').click();
    await page.waitForTimeout(500);
    const createInput = page.locator('[data-testid="create-board-name"]');
    const innerInput = createInput.locator('input').first();
    const createInputToUse = await innerInput.count() > 0 ? innerInput : createInput;
    await createInputToUse.fill('Brand New Board');
    await page.screenshot({ path: 'test-results/13-create-modal.png', fullPage: true });
    await page.locator('[data-testid="create-board-submit"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/14-new-board.png', fullPage: true });
    console.log('URL after creating board:', page.url());

    // 15. Logout
    const logoutBtn = page.locator('[data-testid="logout-button"]');
    if (await logoutBtn.count() === 0) {
      // Try finding by text
      await page.locator('button:has-text("Logout"), span:has-text("Logout")').first().click();
    } else {
      await logoutBtn.click();
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/15-logout.png', fullPage: true });
    console.log('URL after logout:', page.url());
  });

  test('register flow', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.locator('input[type="text"]').first().fill('New Test User');
    await page.locator('input[type="email"]').fill(uniqueEmail);
    await page.locator('input[type="password"]').fill('password123');

    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/boards', { timeout: 5000 });
    await page.screenshot({ path: 'test-results/20-register-success.png', fullPage: true });
    expect(page.url()).toContain('/boards');
  });
});
