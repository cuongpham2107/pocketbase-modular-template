import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('theme studio opens, switches mode, and updates palette', async ({ app, browser }) => {
  // 1. Mở trang và đăng nhập
  await app.open('/');
  await browser.locator('input[type="email"]').fill('admin@example.com');
  await browser.locator('input[type="password"]').fill('admin123');
  await browser.locator('button[type="submit"]').click();

  // Đợi vào trang Admin
  await expect(browser.locator('text=Admin').first()).toBeVisible();

  // 2. Nhấn vào nút Palette icon trên Header để mở Theme Studio
  const themeButton = browser.locator('button[title="Tùy biến theme & bố cục"]').first();
  await expect(themeButton).toBeVisible();
  await themeButton.click();

  // 3. Kiểm tra Header popup "Theme Studio" xuất hiện
  await expect(browser.locator('text=Theme Studio').first()).toBeVisible();
  await expect(browser.locator('text=Tùy biến thời gian thực chuẩn Filament').first()).toBeVisible();

  // 4. Kiểm tra các Preset có mặt (Modern, Precision, Velvet, Obsidian)
  await expect(browser.locator('button:has-text("Modern")').first()).toBeVisible();
  await expect(browser.locator('button:has-text("Precision")').first()).toBeVisible();
  await expect(browser.locator('button:has-text("Velvet")').first()).toBeVisible();
  await expect(browser.locator('button:has-text("Obsidian")').first()).toBeVisible();

  // 5. Chọn chế độ Tối (Dark mode)
  const darkModeButton = browser.locator('button:has-text("Tối")').first();
  await darkModeButton.click();

  // Kiểm tra documentElement có class 'dark'
  const isDark = await browser.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(isDark).toBe(true);

  // 6. Chuyển lại chế độ Sáng (Light mode)
  const lightModeButton = browser.locator('button:has-text("Sáng")').first();
  await lightModeButton.click();

  const isLight = await browser.evaluate(() => !document.documentElement.classList.contains('dark'));
  expect(isLight).toBe(true);
});
