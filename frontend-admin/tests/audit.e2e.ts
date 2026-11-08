import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

/**
 * Nhật ký thao tác (audit log).
 *
 * Selector cố tình **không phụ thuộc ngôn ngữ**: ngôn ngữ UI lấy từ
 * `navigator.language` của browser test nên có thể là vi hoặc en.
 *
 * Điều kiện: backend + Postgres + Redis + worker đang chạy. Chính lần login của
 * test này cũng tạo một bản ghi audit (`POST /auth/login` là mutation).
 */
test('audit log hiển thị bản ghi, tìm kiếm và mở chi tiết', async ({ app, browser }) => {
  // 1. Đăng nhập admin
  await app.open('/');
  await browser.locator('input[type="email"]').fill('admin@example.com');
  await browser.locator('input[type="password"]').fill('admin123');
  await browser.locator('button[type="submit"]').click();

  // 2. Chờ sidebar render (dấu hiệu đăng nhập thật)
  await expect(browser.locator('a[href="/audit"]').first()).toBeVisible();

  // 3. Deep-link trực tiếp tới trang audit (react-router + reload)
  await app.open('/audit');

  // 4. Bảng audit render với dữ liệu thật (login không có actor → dựa vào action)
  await expect(browser.locator('table').first()).toBeVisible();

  // 5. Tìm kiếm theo action → còn bản ghi login
  const search = browser.locator('main input').first();
  await search.fill('login');
  await expect(browser.locator('td:has-text("auth/login")').first()).toBeVisible();

  // 6. Bộ lọc action là dropdown (không phải ô gõ tay) và lọc được
  await search.fill('');
  const actionSelect = browser.locator('main button[role="combobox"]').first();
  await expect(actionSelect).toBeVisible();
  await actionSelect.click();
  await expect(browser.locator('[role="option"]:has-text("Tất cả hành động")').first()).toBeVisible();
  await browser.locator('[role="option"]:has-text("auth/login")').first().click();
  await expect(browser.locator('td:has-text("auth/login")').first()).toBeVisible();
  await expect(browser.locator('td:has-text("settings/theme")').first()).toBeHidden();

  // 6. Mở chi tiết → Sheet hiển thị request_id + trace_id (nhãn kỹ thuật, không dịch)
  await browser.locator('tbody tr').first().click();
  await expect(browser.locator('text=request_id').first()).toBeVisible();
  await expect(browser.locator('text=trace_id').first()).toBeVisible();

  // 7. Nút xuất CSV chỉ hiện với quyền audit:export (admin có)
  await expect(browser.locator('button:has-text("CSV")').first()).toBeVisible();
});
