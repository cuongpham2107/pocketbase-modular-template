import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('Quản lý người dùng: Đăng nhập admin và hiển thị DataTable users', async ({ app, browser }) => {
  await app.open('/');

  // Điền thông tin đăng nhập admin
  const emailInput = browser.locator('input[type="email"]');
  const passwordInput = browser.locator('input[type="password"]');
  await emailInput.fill('admin@example.com');
  await passwordInput.fill('admin123');
  await browser.locator('button[type="submit"]').click();

  // Đợi sidebar render (dấu hiệu đăng nhập thật)
  const usersMenu = browser.locator('a[href="/users"]').first();
  await expect(usersMenu).toBeVisible();
  await usersMenu.click();

  // Xác minh Header DataTable Người Dùng
  await expect(browser.locator('h1:has-text("Quản Lý Người Dùng")').first()).toBeVisible();
  await expect(browser.locator('button:has-text("Thêm Người Dùng")')).toBeVisible();

  // Xác minh dòng tài khoản admin tồn tại trong bảng
  await expect(browser.locator('td:has-text("admin@example.com")').first()).toBeVisible();
});
