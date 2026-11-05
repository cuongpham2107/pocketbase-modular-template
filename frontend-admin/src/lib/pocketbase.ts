import PocketBase from 'pocketbase';

// Sử dụng window.location.origin khi chạy chung cổng với PocketBase backend
export const pb = new PocketBase(
  import.meta.env.VITE_PB_URL || (typeof window !== 'undefined' ? window.location.origin : '')
);

export function getCurrentUser() {
  return pb.authStore.record;
}

export function isAuthenticated() {
  return pb.authStore.isValid;
}

export function logout() {
  pb.authStore.clear();
}

