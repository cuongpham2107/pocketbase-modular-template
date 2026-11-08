import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

/**
 * Thông báo realtime (F2).
 *
 * Selector không phụ thuộc ngôn ngữ (UI có thể là vi hoặc en tuỳ `navigator.language`).
 * Điều kiện: backend + Postgres + Redis + worker đang chạy; WebSocket đi qua proxy
 * `/api` với `ws: true` của Vite.
 */
test('chuông thông báo mở panel realtime và trang /notifications', async ({ app, browser }) => {
  // 1. Đăng nhập admin
  await app.open('/');
  await browser.locator('input[type="email"]').fill('admin@example.com');
  await browser.locator('input[type="password"]').fill('admin123');
  await browser.locator('button[type="submit"]').click();
  await expect(browser.locator('a[href="/notifications"]').first()).toBeVisible();

  // 2. Chuông nằm trong header (data-testid cố định, không phụ thuộc bản dịch)
  const bell = browser.locator('[data-testid="notification-bell"]').first();
  await expect(bell).toBeVisible();

  // 3. Mở panel: Sheet (role="dialog") phải xuất hiện, trượt từ phải sang trái
  await bell.click();
  await expect(browser.locator('[role="dialog"]').first()).toBeVisible();
  // `data-side` là thứ Animate UI dùng để chọn hướng trượt (right → translateX 100% → 0).
  await expect(browser.locator('[data-slot="sheet-content"][data-side="right"]')).toBeVisible();

  // 4. Đóng panel rồi deep-link tới trang /notifications
  await browser.keyboard.press('Escape');
  await app.open('/notifications');
  await expect(browser.locator('a[href="/notifications"]').first()).toBeVisible();
  await expect(browser.locator('main').first()).toBeVisible();

  // 5. Nút làm mới luôn có trên trang (không phụ thuộc danh sách rỗng/không rỗng)
  await expect(browser.locator('main button').first()).toBeVisible();
});
