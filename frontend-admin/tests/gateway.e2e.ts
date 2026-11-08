import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('Gateway & AI MCP Interactive Playground', async ({ app, browser }) => {
  await app.open('/');

  // Đăng nhập nếu cần
  const emailInput = browser.locator('input[type="email"]');
  if (await emailInput.isVisible()) {
    await emailInput.fill('admin@example.com');
    await browser.locator('input[type="password"]').fill('admin123');
    await browser.locator('button[type="submit"]').click();
  }

  // Điều hướng đến Cổng API tài liệu
  const gatewayNav = browser.locator('a[href="/gateway"]').first();
  await expect(gatewayNav).toBeVisible();
  await gatewayNav.click();

  // Kiểm tra Tab MCP Playground
  await expect(browser.locator('text=AI MCP Playground & Tools').first()).toBeVisible();
  await expect(browser.locator('text=Interactive MCP Playground').first()).toBeVisible();

  // Kiểm tra danh sách Tools
  await expect(browser.locator('text=list_roles_and_permissions').first()).toBeVisible();
  await expect(browser.locator('text=check_user_permission').first()).toBeVisible();

  // Chọn tool check_user_permission
  await browser.locator('div:has-text("check_user_permission")').last().click();

  // Bấm Chạy Tool
  const runBtn = browser.locator('button:has-text("Chạy Tool")').first();
  await expect(runBtn).toBeVisible();
  await runBtn.click();

  // Kiểm tra kết quả phản hồi
  await expect(browser.locator('text=Kết Quả Phản Hồi (Execution Result)').first()).toBeVisible();
});
