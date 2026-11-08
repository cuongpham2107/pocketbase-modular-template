import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('dynamic rbac view displays models, CRUD permissions, and role switcher', async ({ app, browser }) => {
  // 1. Đăng nhập với tài khoản Admin
  await app.open('/');
  await browser.locator('input[type="email"]').fill('admin@example.com');
  await browser.locator('input[type="password"]').fill('admin123');
  await browser.locator('button[type="submit"]').click();

  // 2. Chờ sidebar render rồi mở trang RBAC
  const rbacNav = browser.locator('a[href="/rbac"]').first();
  await expect(rbacNav).toBeVisible();
  await rbacNav.click();

  // 3. Kiểm tra các Role Switcher pills (Admin và User)
  const adminRoleButton = browser.locator('button:has-text("Admin")').first();
  const userRoleButton = browser.locator('button:has-text("User")').first();
  await expect(adminRoleButton).toBeVisible();
  await expect(userRoleButton).toBeVisible();

  // 4. Kiểm tra các Model Resource Cards được render (users, files, roles, media_folders)
  await expect(browser.locator('text=users').first()).toBeVisible();
  await expect(browser.locator('text=media').first()).toBeVisible();
  await expect(browser.locator('text=roles').first()).toBeVisible();
  await expect(browser.locator('text=media_folders').first()).toBeVisible();

  // 5. Kiểm tra các ô hành động CRUD cơ bản (Xem, Thêm, Sửa, Xóa)
  await expect(browser.locator('text=Xem').first()).toBeVisible();
  await expect(browser.locator('text=Thêm').first()).toBeVisible();
  await expect(browser.locator('text=Sửa').first()).toBeVisible();
  await expect(browser.locator('text=Xóa').first()).toBeVisible();

  // 6. Kiểm tra nút Lưu phân quyền
  const saveButton = browser.locator('button:has-text("Lưu Phân Quyền & Người Dùng")').first();
  await expect(saveButton).toBeVisible();

  // 7. Chuyển sang xem role "User"
  await userRoleButton.click();
  await expect(browser.locator('text=Người Dùng Được Gán Vai Trò Này:').first()).toBeVisible();
});
