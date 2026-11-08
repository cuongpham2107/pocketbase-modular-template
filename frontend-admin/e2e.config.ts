import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

export default {
  targets: [{
    // Ghim locale vi-VN để UI (react-i18next detect từ `navigator.language`)
    // luôn là tiếng Việt, tránh test phụ thuộc ngôn ngữ máy chạy CI.
    engine: web({ locale: 'vi-VN' }),
    app: {
      url: process.env.APP_URL ?? 'http://localhost:5173',
    },
  }],
} satisfies E2EConfig;
