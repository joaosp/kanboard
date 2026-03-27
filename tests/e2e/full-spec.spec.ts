import { test, expect, type Page } from '@playwright/test';

// Helper: login and return to boards dashboard
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/boards', { timeout: 5000 });
  // Wait for boards to finish loading
  await page.waitForTimeout(1500);
}

// Helper: navigate to first board
async function goToFirstBoard(page: Page) {
  const card = page.locator('[data-testid="board-card"]').first();
  await card.waitFor({ state: 'visible', timeout: 5000 });
  await card.click();
  await page.waitForTimeout(2000);
  await page.locator('[data-testid="column"], [data-testid="add-list-form"]').first().waitFor({ state: 'visible', timeout: 5000 });
}

// ============================================================
// AUTH TESTS
// ============================================================
test.describe('Auth', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/auth-01-login-page.png', fullPage: true });

    // Should have email, password inputs and submit button
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    // Should have link to register
    await expect(page.locator('a[href="/register"]')).toBeVisible();
  });

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/auth-02-register-page.png', fullPage: true });

    // Should have name, email, password inputs
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    // Should have link to login
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('login with valid credentials redirects to /boards', async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');
    expect(page.url()).toContain('/boards');
    await page.screenshot({ path: 'test-results/auth-03-login-success.png', fullPage: true });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill('demo@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/auth-04-login-error.png', fullPage: true });

    // Should show error message and stay on login page
    const error = page.locator('[data-testid="login-error"]');
    await expect(error).toBeVisible({ timeout: 3000 });
    expect(page.url()).toContain('/login');
  });

  test('register new user and redirect to /boards', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const email = `testuser-${Date.now()}@example.com`;
    await page.locator('input[type="text"]').fill('Test User');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/boards', { timeout: 5000 });
    await page.screenshot({ path: 'test-results/auth-05-register-success.png', fullPage: true });

    expect(page.url()).toContain('/boards');
  });

  test('register with duplicate email shows error', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="text"]').fill('Demo Duplicate');
    await page.locator('input[type="email"]').fill('demo@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/auth-06-register-dup.png', fullPage: true });

    const error = page.locator('[data-testid="register-error"]');
    await expect(error).toBeVisible({ timeout: 3000 });
    expect(page.url()).toContain('/register');
  });

  test('logout redirects to /login', async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');
    await page.locator('[data-testid="logout-button"]').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/auth-07-logout.png', fullPage: true });

    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user redirected to /login', async ({ page }) => {
    await page.goto('/boards');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');
  });

  test('navbar shows user name when logged in', async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');
    const userName = page.locator('[data-testid="navbar-user"]');
    await expect(userName).toBeVisible();
    await expect(userName).toContainText('Demo User');
  });
});

// ============================================================
// BOARDS DASHBOARD TESTS
// ============================================================
test.describe('Boards Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');
  });

  test('dashboard shows seed boards', async ({ page }) => {
    await page.locator('[data-testid="board-card"]').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.screenshot({ path: 'test-results/boards-01-dashboard.png', fullPage: true });

    const cards = page.locator('[data-testid="board-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2); // Project Alpha + Project Beta
  });

  test('board cards show member count', async ({ page }) => {
    await page.locator('[data-testid="board-card"]').first().waitFor({ state: 'visible', timeout: 5000 });
    const firstCard = page.locator('[data-testid="board-card"]').first();
    const text = await firstCard.textContent();
    expect(text).toMatch(/\d+ members?/);
  });

  test('clicking board card navigates to board view', async ({ page }) => {
    await goToFirstBoard(page);
    await page.screenshot({ path: 'test-results/boards-02-navigate.png', fullPage: true });

    expect(page.url()).toMatch(/\/boards\/[\w-]+$/);
  });

  test('create board modal opens and closes', async ({ page }) => {
    await page.locator('[data-testid="board-card"]').first().waitFor({ state: 'visible', timeout: 5000 });

    // Open modal
    await page.locator('[data-testid="create-board-button"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/boards-03-create-modal.png', fullPage: true });
    await expect(page.locator('[data-testid="modal"]')).toBeVisible();

    // Close with cancel
    await page.locator('[data-testid="create-board-cancel"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();

    // Open again and close with X
    await page.locator('[data-testid="create-board-button"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="modal-close"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();

    // Open again and close with Escape
    await page.locator('[data-testid="create-board-button"]').click();
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();

    // Open again and close with backdrop click
    await page.locator('[data-testid="create-board-button"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="modal-overlay"]').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();
  });

  test('create board adds to dashboard and navigates to it', async ({ page }) => {
    await page.locator('[data-testid="board-card"]').first().waitFor({ state: 'visible', timeout: 5000 });
    const beforeCount = await page.locator('[data-testid="board-card"]').count();

    await page.locator('[data-testid="create-board-button"]').click();
    await page.waitForTimeout(500);

    const nameInput = page.locator('[data-testid="create-board-name"]').locator('input').first();
    const actualInput = await nameInput.count() > 0 ? nameInput : page.locator('[data-testid="create-board-name"]');
    await actualInput.fill('Test Board Created');
    await page.locator('[data-testid="create-board-submit"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/boards-04-created.png', fullPage: true });

    // Should navigate to the new board
    expect(page.url()).toMatch(/\/boards\/[\w-]+$/);

    // Go back and verify board appears
    await page.locator('[data-testid="back-to-boards"]').click();
    await page.waitForTimeout(2000);
    await page.locator('[data-testid="board-card"]').first().waitFor({ state: 'visible', timeout: 5000 });
    const afterCount = await page.locator('[data-testid="board-card"]').count();
    expect(afterCount).toBe(beforeCount + 1);
  });
});

// ============================================================
// BOARD VIEW TESTS
// ============================================================
test.describe('Board View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');
    await goToFirstBoard(page);
  });

  test('board view shows board header with name', async ({ page }) => {
    await page.screenshot({ path: 'test-results/view-01-header.png', fullPage: true });
    await expect(page.locator('[data-testid="board-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="board-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-boards"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-board-name"]')).toBeVisible();
  });

  test('board view shows columns with seed data', async ({ page }) => {
    const columns = page.locator('[data-testid="column"]');
    const colCount = await columns.count();
    await page.screenshot({ path: 'test-results/view-02-columns.png', fullPage: true });

    // Seed data has 3 lists per board
    expect(colCount).toBeGreaterThanOrEqual(2);

    // Each column should have a header
    for (let i = 0; i < colCount; i++) {
      const col = columns.nth(i);
      await expect(col.locator('[data-testid="column-header"]')).toBeVisible();
    }
  });

  test('columns show card count', async ({ page }) => {
    const firstHeader = page.locator('[data-testid="column-header"]').first();
    const headerText = await firstHeader.textContent();
    // Header should contain a number (card count)
    expect(headerText).toMatch(/\d/);
  });

  test('columns show card items', async ({ page }) => {
    const cards = page.locator('[data-testid="card-item"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Each card should show a title
    const firstCard = cards.first();
    const cardText = await firstCard.textContent();
    expect(cardText?.length).toBeGreaterThan(0);
  });

  test('back to boards link works', async ({ page }) => {
    await page.locator('[data-testid="back-to-boards"]').click();
    await page.waitForURL('**/boards', { timeout: 5000 });
    expect(page.url()).toMatch(/\/boards$/);
  });
});

// ============================================================
// BOARD NAME EDITING (admin only)
// ============================================================
test.describe('Board Name Editing', () => {
  test('admin can edit board name', async ({ page }) => {
    await login(page, 'admin@example.com', 'admin123');
    await goToFirstBoard(page);

    const originalName = await page.locator('[data-testid="board-name"]').textContent();

    // Click edit
    await page.locator('[data-testid="edit-board-name"]').click();
    await page.waitForTimeout(300);
    const input = page.locator('[data-testid="board-name-input"]');
    await expect(input).toBeVisible();
    await page.screenshot({ path: 'test-results/edit-01-editing.png', fullPage: true });

    // Type new name and press Enter
    await input.clear();
    await input.fill('Renamed Board');
    await input.press('Enter');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/edit-02-renamed.png', fullPage: true });

    await expect(page.locator('[data-testid="board-name"]')).toContainText('Renamed Board');

    // Restore original name
    await page.locator('[data-testid="edit-board-name"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid="board-name-input"]').clear();
    await page.locator('[data-testid="board-name-input"]').fill(originalName ?? 'Project Alpha');
    await page.locator('[data-testid="board-name-input"]').press('Enter');
    await page.waitForTimeout(1000);
  });

  test('edit board name can be cancelled with Escape', async ({ page }) => {
    await login(page, 'admin@example.com', 'admin123');
    await goToFirstBoard(page);

    const originalName = await page.locator('[data-testid="board-name"]').textContent();
    await page.locator('[data-testid="edit-board-name"]').click();
    await page.waitForTimeout(300);

    const input = page.locator('[data-testid="board-name-input"]');
    await input.clear();
    await input.fill('Should Not Save');
    await input.press('Escape');
    await page.waitForTimeout(500);

    // Name should revert
    await expect(page.locator('[data-testid="board-name"]')).toContainText(originalName ?? 'Project Alpha');
  });
});

// ============================================================
// LIST (COLUMN) CRUD
// ============================================================
test.describe('Lists', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');
    await goToFirstBoard(page);
  });

  test('add list form is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="add-list-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-list-button"]')).toBeVisible();
  });

  test('create a new list', async ({ page }) => {
    const beforeCount = await page.locator('[data-testid="column"]').count();

    const addInput = page.locator('[data-testid="add-list-input"]');
    const innerInput = addInput.locator('input').first();
    const inputToUse = await innerInput.count() > 0 ? innerInput : addInput;
    await inputToUse.fill('Brand New List');
    await page.locator('[data-testid="add-list-button"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/list-01-created.png', fullPage: true });

    const afterCount = await page.locator('[data-testid="column"]').count();
    expect(afterCount).toBe(beforeCount + 1);
  });

  test('delete a list', async ({ page }) => {
    // First create a list to delete
    const addInput = page.locator('[data-testid="add-list-input"]');
    const innerInput = addInput.locator('input').first();
    const inputToUse = await innerInput.count() > 0 ? innerInput : addInput;
    await inputToUse.fill('List To Delete');
    await page.locator('[data-testid="add-list-button"]').click();
    await page.waitForTimeout(2000);

    const beforeCount = await page.locator('[data-testid="column"]').count();

    // Delete the last list (the one we just created)
    const deleteBtn = page.locator('[data-testid="delete-list-button"]').last();
    await deleteBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/list-02-deleted.png', fullPage: true });

    const afterCount = await page.locator('[data-testid="column"]').count();
    expect(afterCount).toBe(beforeCount - 1);
  });

  test('empty list name does not create list', async ({ page }) => {
    const beforeCount = await page.locator('[data-testid="column"]').count();
    await page.locator('[data-testid="add-list-button"]').click();
    await page.waitForTimeout(1000);
    const afterCount = await page.locator('[data-testid="column"]').count();
    expect(afterCount).toBe(beforeCount);
  });
});

// ============================================================
// CARD CRUD
// ============================================================
test.describe('Cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');
    await goToFirstBoard(page);
  });

  test('add card form is visible in each column', async ({ page }) => {
    const columns = page.locator('[data-testid="column"]');
    const colCount = await columns.count();
    for (let i = 0; i < colCount; i++) {
      const col = columns.nth(i);
      await expect(col.locator('[data-testid="add-card-form"]')).toBeVisible();
      await expect(col.locator('[data-testid="add-card-input"]')).toBeVisible();
      await expect(col.locator('[data-testid="add-card-button"]')).toBeVisible();
    }
  });

  test('create a new card', async ({ page }) => {
    const firstColumn = page.locator('[data-testid="column"]').first();
    const beforeCount = await firstColumn.locator('[data-testid="card-item"]').count();

    await firstColumn.locator('[data-testid="add-card-input"]').fill('New Test Card');
    await firstColumn.locator('[data-testid="add-card-button"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/card-01-created.png', fullPage: true });

    const afterCount = await firstColumn.locator('[data-testid="card-item"]').count();
    expect(afterCount).toBe(beforeCount + 1);

    // Card should show the title
    const lastCard = firstColumn.locator('[data-testid="card-item"]').last();
    await expect(lastCard).toContainText('New Test Card');
  });

  test('empty card title does not create card', async ({ page }) => {
    const firstColumn = page.locator('[data-testid="column"]').first();
    const beforeCount = await firstColumn.locator('[data-testid="card-item"]').count();

    await firstColumn.locator('[data-testid="add-card-button"]').click();
    await page.waitForTimeout(1000);

    const afterCount = await firstColumn.locator('[data-testid="card-item"]').count();
    expect(afterCount).toBe(beforeCount);
  });

  test('click card opens card modal', async ({ page }) => {
    const firstCard = page.locator('[data-testid="card-item"]').first();
    await firstCard.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/card-02-modal-open.png', fullPage: true });

    await expect(page.locator('[data-testid="modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-modal-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-modal-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-modal-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-modal-delete"]')).toBeVisible();
  });

  test('card modal shows card details', async ({ page }) => {
    const firstCard = page.locator('[data-testid="card-item"]').first();
    const cardTitle = await firstCard.textContent();

    await firstCard.click();
    await page.waitForTimeout(1000);

    const modalTitle = await page.locator('[data-testid="card-modal-title"]').inputValue();
    expect(modalTitle).toBe(cardTitle?.trim());
  });

  test('edit card title via modal', async ({ page }) => {
    // Create a card to edit
    const firstColumn = page.locator('[data-testid="column"]').first();
    await firstColumn.locator('[data-testid="add-card-input"]').fill('Card To Edit');
    await firstColumn.locator('[data-testid="add-card-button"]').click();
    await page.waitForTimeout(2000);

    // Open the card
    const card = firstColumn.locator('[data-testid="card-item"]').last();
    await card.click();
    await page.waitForTimeout(1000);

    // Edit title
    const titleInput = page.locator('[data-testid="card-modal-title"]');
    await titleInput.clear();
    await titleInput.fill('Edited Card Title');
    await page.locator('[data-testid="card-modal-save"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/card-03-edited.png', fullPage: true });

    // Modal should close
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible({ timeout: 3000 });

    // Card should show updated title
    const updatedCard = firstColumn.locator('[data-testid="card-item"]').last();
    await expect(updatedCard).toContainText('Edited Card Title');
  });

  test('edit card description via modal', async ({ page }) => {
    const firstCard = page.locator('[data-testid="card-item"]').first();
    await firstCard.click();
    await page.waitForTimeout(1000);

    const descInput = page.locator('[data-testid="card-modal-description"]');
    await descInput.fill('This is a test description');
    await page.locator('[data-testid="card-modal-save"]').click();
    await page.waitForTimeout(2000);

    // Modal should close
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible({ timeout: 3000 });

    // Re-open and verify description persisted
    await firstCard.click();
    await page.waitForTimeout(1000);
    const savedDesc = await page.locator('[data-testid="card-modal-description"]').inputValue();
    expect(savedDesc).toBe('This is a test description');

    // Close modal
    await page.locator('[data-testid="modal-close"]').click();
    await page.waitForTimeout(500);
  });

  test('delete card via modal', async ({ page }) => {
    // Create a card to delete
    const firstColumn = page.locator('[data-testid="column"]').first();
    await firstColumn.locator('[data-testid="add-card-input"]').fill('Card To Delete');
    await firstColumn.locator('[data-testid="add-card-button"]').click();
    await page.waitForTimeout(2000);

    const beforeCount = await firstColumn.locator('[data-testid="card-item"]').count();

    // Open and delete
    await firstColumn.locator('[data-testid="card-item"]').last().click();
    await page.waitForTimeout(1000);
    await page.locator('[data-testid="card-modal-delete"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/card-04-deleted.png', fullPage: true });

    // Modal should close
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible({ timeout: 3000 });

    const afterCount = await firstColumn.locator('[data-testid="card-item"]').count();
    expect(afterCount).toBe(beforeCount - 1);
  });

  test('card modal closes with X button', async ({ page }) => {
    await page.locator('[data-testid="card-item"]').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="modal"]')).toBeVisible();

    await page.locator('[data-testid="modal-close"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();
  });

  test('card modal closes with Escape key', async ({ page }) => {
    await page.locator('[data-testid="card-item"]').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="modal"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();
  });

  test('card modal closes with backdrop click', async ({ page }) => {
    await page.locator('[data-testid="card-item"]').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="modal"]')).toBeVisible();

    await page.locator('[data-testid="modal-overlay"]').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();
  });
});

// ============================================================
// API EDGE CASES (via fetch from browser context)
// ============================================================
test.describe('API Edge Cases', () => {
  test('API returns 401 without auth token', async ({ page }) => {
    const response = await page.request.get('/api/boards');
    expect(response.status()).toBe(401);
  });

  test('API returns 401 with invalid token', async ({ page }) => {
    const response = await page.request.get('/api/boards', {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });
    expect(response.status()).toBe(401);
  });

  test('login API validates input', async ({ page }) => {
    // Missing password
    const resp1 = await page.request.post('/api/auth/login', {
      data: { email: 'test@test.com' },
    });
    expect(resp1.status()).toBe(400);

    // Invalid email format
    const resp2 = await page.request.post('/api/auth/login', {
      data: { email: 'not-an-email', password: 'pass' },
    });
    expect(resp2.status()).toBe(400);
  });

  test('register API validates input', async ({ page }) => {
    // Missing fields
    const resp1 = await page.request.post('/api/auth/register', {
      data: { email: 'test@test.com' },
    });
    expect(resp1.status()).toBe(400);

    // Password too short
    const resp2 = await page.request.post('/api/auth/register', {
      data: { email: 'test@test.com', name: 'Test', password: '12345' },
    });
    expect(resp2.status()).toBe(400);
  });

  test('board API validates UUID params', async ({ page }) => {
    // Login first
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: 'demo@example.com', password: 'demo123' },
    });
    const { data } = await loginResp.json();
    const token = data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    // Invalid UUID
    const resp = await page.request.get('/api/boards/not-a-uuid', { headers });
    expect(resp.status()).toBe(400);
  });

  test('non-member cannot access board', async ({ page }) => {
    // Register a new user
    const email = `isolated-${Date.now()}@example.com`;
    const regResp = await page.request.post('/api/auth/register', {
      data: { email, name: 'Isolated', password: 'password123' },
    });
    const { data: regData } = await regResp.json();
    const token = regData.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    // Get boards for demo user (this user has none)
    const boardsResp = await page.request.get('/api/boards', { headers });
    const { data: boards } = await boardsResp.json();
    expect(boards).toEqual([]);

    // Try to access a board they're not a member of
    // First get a board ID from the demo user
    const demoLogin = await page.request.post('/api/auth/login', {
      data: { email: 'demo@example.com', password: 'demo123' },
    });
    const { data: demoData } = await demoLogin.json();
    const demoHeaders = { 'Authorization': `Bearer ${demoData.token}` };
    const demoBoardsResp = await page.request.get('/api/boards', { headers: demoHeaders });
    const { data: demoBoards } = await demoBoardsResp.json();

    if (demoBoards.length > 0) {
      const boardId = demoBoards[0].id;
      const resp = await page.request.get(`/api/boards/${boardId}`, { headers });
      expect(resp.status()).toBe(403);
    }
  });

  test('card CRUD via API works end-to-end', async ({ page }) => {
    // Login
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: 'demo@example.com', password: 'demo123' },
    });
    const { data: loginData } = await loginResp.json();
    const headers = { 'Authorization': `Bearer ${loginData.token}` };

    // Get first board
    const boardsResp = await page.request.get('/api/boards', { headers });
    const { data: boards } = await boardsResp.json();
    const boardId = boards[0].id;

    // Get board details to find a list
    const boardResp = await page.request.get(`/api/boards/${boardId}`, { headers });
    const { data: board } = await boardResp.json();
    const listId = board.lists[0].id;

    // Create card
    const createResp = await page.request.post(`/api/lists/${listId}/cards`, {
      headers,
      data: { title: 'API Test Card', description: 'Created via API' },
    });
    expect(createResp.status()).toBe(201);
    const { data: card } = await createResp.json();
    expect(card.title).toBe('API Test Card');
    expect(card.description).toBe('Created via API');

    // Get card
    const getResp = await page.request.get(`/api/cards/${card.id}`, { headers });
    expect(getResp.status()).toBe(200);
    const { data: fetchedCard } = await getResp.json();
    expect(fetchedCard.title).toBe('API Test Card');

    // Update card
    const updateResp = await page.request.patch(`/api/cards/${card.id}`, {
      headers,
      data: { title: 'Updated API Card', description: null },
    });
    expect(updateResp.status()).toBe(200);
    const { data: updatedCard } = await updateResp.json();
    expect(updatedCard.title).toBe('Updated API Card');
    expect(updatedCard.description).toBeNull();

    // Delete card
    const deleteResp = await page.request.delete(`/api/cards/${card.id}`, { headers });
    expect(deleteResp.status()).toBe(204);

    // Verify deleted
    const getDeletedResp = await page.request.get(`/api/cards/${card.id}`, { headers });
    expect(getDeletedResp.status()).toBe(404);
  });

  test('list CRUD via API works end-to-end', async ({ page }) => {
    // Login
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: 'demo@example.com', password: 'demo123' },
    });
    const { data: loginData } = await loginResp.json();
    const headers = { 'Authorization': `Bearer ${loginData.token}` };

    // Get first board
    const boardsResp = await page.request.get('/api/boards', { headers });
    const { data: boards } = await boardsResp.json();
    const boardId = boards[0].id;

    // Create list
    const createResp = await page.request.post(`/api/boards/${boardId}/lists`, {
      headers,
      data: { name: 'API Test List' },
    });
    expect(createResp.status()).toBe(201);
    const { data: list } = await createResp.json();
    expect(list.name).toBe('API Test List');

    // Update list
    const updateResp = await page.request.patch(`/api/lists/${list.id}`, {
      headers,
      data: { name: 'Updated API List' },
    });
    expect(updateResp.status()).toBe(200);
    const { data: updatedList } = await updateResp.json();
    expect(updatedList.name).toBe('Updated API List');

    // Delete list
    const deleteResp = await page.request.delete(`/api/lists/${list.id}`, { headers });
    expect(deleteResp.status()).toBe(204);
  });

  test('board delete requires admin role', async ({ page }) => {
    // Login as demo (member, not admin)
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: 'demo@example.com', password: 'demo123' },
    });
    const { data: loginData } = await loginResp.json();
    const headers = { 'Authorization': `Bearer ${loginData.token}` };

    const boardsResp = await page.request.get('/api/boards', { headers });
    const { data: boards } = await boardsResp.json();

    if (boards.length > 0) {
      const deleteResp = await page.request.delete(`/api/boards/${boards[0].id}`, { headers });
      expect(deleteResp.status()).toBe(403);
    }
  });

  test('board update requires admin role', async ({ page }) => {
    const loginResp = await page.request.post('/api/auth/login', {
      data: { email: 'demo@example.com', password: 'demo123' },
    });
    const { data: loginData } = await loginResp.json();
    const headers = { 'Authorization': `Bearer ${loginData.token}` };

    const boardsResp = await page.request.get('/api/boards', { headers });
    const { data: boards } = await boardsResp.json();

    if (boards.length > 0) {
      const updateResp = await page.request.patch(`/api/boards/${boards[0].id}`, {
        headers,
        data: { name: 'Should Fail' },
      });
      expect(updateResp.status()).toBe(403);
    }
  });
});

// ============================================================
// NAVIGATION & ROUTING
// ============================================================
test.describe('Navigation & Routing', () => {
  test('/ redirects to /boards (when authenticated)', async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');
    await page.goto('/');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/boards');
  });

  test('unknown routes redirect to /boards', async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');
    await page.goto('/nonexistent');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/boards');
  });

  test('direct navigation to board view works', async ({ page }) => {
    await login(page, 'demo@example.com', 'demo123');

    // Get a board ID from dashboard
    await page.locator('[data-testid="board-card"]').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[data-testid="board-card"]').first().click();
    await page.waitForTimeout(2000);
    const boardUrl = page.url();

    // Navigate away and back directly
    await page.goto('/boards');
    await page.waitForTimeout(1000);
    await page.goto(boardUrl);
    await page.waitForTimeout(2000);

    // Should show the board view
    await expect(page.locator('[data-testid="board-header"]')).toBeVisible({ timeout: 5000 });
  });

  test('login page accessible when not authenticated', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('register page accessible when not authenticated', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
