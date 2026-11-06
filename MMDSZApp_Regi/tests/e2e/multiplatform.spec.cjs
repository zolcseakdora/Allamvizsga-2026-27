const { test, expect } = require('@playwright/test');

async function alkalmazasMegnyitasa(page) {
  const response = await page.goto('/', {
    waitUntil: 'domcontentloaded'
  });

  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);

  // Az alkalmazas eloszor nyelvet ker.
  const magyar = page.getByText(/Magyar/i).first();

  await expect(magyar).toBeVisible({
    timeout: 20000
  });

  await magyar.click();

  // A nyelvvalasztas utan jelenjen meg a fo alkalmazas.
  await expect(page.locator('body')).toContainText(
    /MMDSZ/i,
    { timeout: 30000 }
  );
}

test('A publikus alkalmazas betoltodik', async ({ page }) => {
  await alkalmazasMegnyitasa(page);

  await expect(page.locator('body')).toContainText(
    /MMDSZ/i
  );
});

test('A bejelentkezesi oldal elerheto', async ({ page }) => {
  await alkalmazasMegnyitasa(page);

  const response = await page.goto('/auth', {
    waitUntil: 'domcontentloaded'
  });

  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);

  await expect(page.locator('input').first()).toBeVisible({
    timeout: 30000
  });
});