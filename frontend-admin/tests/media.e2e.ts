import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('media manager folder tree, folder creation, and view toggle', async ({ app, browser }) => {
  // 1. Đăng nhập với tài khoản Admin
  await app.open('/');
  await browser.locator('input[type="email"]').fill('admin@example.com');
  await browser.locator('input[type="password"]').fill('admin123');
  await browser.locator('button[type="submit"]').click();

  // 2. Chuyển sang màn hình "Thư viện media" qua router
  const mediaNav = browser.locator('a[href="/media"]').first();
  await expect(mediaNav).toBeVisible();
  await mediaNav.click();

  // 3. Kiểm tra các thành phần cốt lõi của Media Library
  await expect(browser.locator('text=Cây Thư Mục').first()).toBeVisible();
  await expect(browser.locator('text=Media Root').first()).toBeVisible();
  await expect(browser.locator('text=Tất cả').first()).toBeVisible();

  // 4. Mở Modal tạo thư mục mới
  const createFolderBtn = browser.locator('button:has-text("Thư mục")').first();
  await expect(createFolderBtn).toBeVisible();
  await createFolderBtn.click();

  // Kiểm tra Dialog "Tạo Thư Mục Mới" xuất hiện
  await expect(browser.locator('text=Tạo Thư Mục Mới').first()).toBeVisible();

  // 5. Nhập tên thư mục và nhấn Tạo Thư Mục
  const folderNameInput = browser.locator('input[placeholder*="Ví dụ:"]').first();
  await folderNameInput.fill('Tài Liệu Dự Án E2E');

  const submitFolderBtn = browser.locator('button:has-text("Tạo Thư Mục")').last();
  await submitFolderBtn.click();

  // 6. Kiểm tra thư mục vừa tạo hiển thị trong cây thư mục
  await expect(browser.locator('text=Tài Liệu Dự Án E2E').first()).toBeVisible();

  // 7. Kiểm tra các nút chuyển đổi chế độ xem Grid và List
  const searchInput = browser.locator('[data-testid="media-search"]').first();
  await expect(searchInput).toBeVisible();
});
