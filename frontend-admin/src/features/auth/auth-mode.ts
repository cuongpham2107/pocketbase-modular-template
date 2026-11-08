export type AuthScreenMode = "login" | "register" | "forgot" | "reset" | "verify"

/** Đọc `?token=` từ liên kết trong email (`/reset-password?token=...`). */
export function tokenFromLocation(): string {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("token") ?? ""
}

/**
 * Màn hình nào đang mở. F5 sẽ thay bằng react-router; ở F0b ta suy ra từ
 * `pathname` + query để liên kết trong email vẫn mở đúng màn hình.
 */
export function initialAuthMode(): AuthScreenMode {
  if (typeof window === "undefined") return "login"

  const path = window.location.pathname
  const mode = new URLSearchParams(window.location.search).get("mode")

  if (path.startsWith("/reset-password") || mode === "reset") return "reset"
  if (path.startsWith("/verify-email") || mode === "verify") return "verify"
  if (mode === "register") return "register"
  if (mode === "forgot") return "forgot"
  return "login"
}
