import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('login as admin and verify admin panel navigation', async ({ app, browser }) => {
  // 1. Mở trang ứng dụng
  await app.open('/');

  // 2. Kiểm tra form đăng nhập xuất hiện
  const emailInput = browser.locator('input[type="email"]');
  const passwordInput = browser.locator('input[type="password"]');
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  // 3. Nhập thông tin đăng nhập admin
  await emailInput.fill('admin@example.com');
  await passwordInput.fill('admin123');

  // 4. Nhấn nút Đăng nhập
  const submitButton = browser.locator('button[type="submit"]');
  await submitButton.click();

  // 5. Đăng nhập thành công → sidebar (react-router) xuất hiện
  const rbacNav = browser.locator('a[href="/rbac"]').first();
  await expect(rbacNav).toBeVisible();
  await expect(browser.locator('a[href="/media"]').first()).toBeVisible();
  await expect(browser.locator('a[href="/gateway"]').first()).toBeVisible();

  // 6. Deep-link bằng router rồi F5 → phiên được khôi phục bằng refresh cookie
  await rbacNav.click();
  await expect(browser.locator('text=Go Code Catalog Sync').first()).toBeVisible();
  await browser.reload();
  await expect(browser.locator('a[href="/rbac"]').first()).toBeVisible();

  // 7. Đăng xuất thật: gọi POST /auth/logout (thu hồi jti) rồi quay về form đăng nhập
  await browser.locator('button[title="Đăng xuất"]').first().click();
  await expect(browser.locator('input[type="email"]')).toBeVisible();
});
