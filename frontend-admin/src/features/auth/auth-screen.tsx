import * as React from "react"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"
import { ForgotPasswordForm } from "./forgot-password-form"
import { ResetPasswordForm } from "./reset-password-form"
import { VerifyEmailScreen } from "./verify-email"
import type { User } from "@/types"
import { initialAuthMode, tokenFromLocation, type AuthScreenMode } from "./auth-mode"

export interface AuthScreenProps {
  onSuccess: (user: User) => void
  onGuestContinue?: () => void
}

export function AuthScreen({ onSuccess, onGuestContinue }: AuthScreenProps) {
  const [mode, setMode] = React.useState<AuthScreenMode>(initialAuthMode)
  const token = React.useMemo(() => tokenFromLocation(), [])

  const backToLogin = React.useCallback(() => {
    if (typeof window !== "undefined" && (window.location.pathname !== "/" || window.location.search)) {
      window.history.replaceState({}, "", "/")
    }
    setMode("login")
  }, [])

  switch (mode) {
    case "register":
      return <RegisterForm onSuccess={onSuccess} onBack={backToLogin} />
    case "forgot":
      return <ForgotPasswordForm onBack={backToLogin} />
    case "reset":
      return <ResetPasswordForm token={token} onBack={backToLogin} />
    case "verify":
      return <VerifyEmailScreen token={token} onBack={backToLogin} />
    default:
      return (
        <LoginForm
          onSuccess={onSuccess}
          onGuestContinue={onGuestContinue}
          onForgotPassword={() => setMode("forgot")}
          onRegister={() => setMode("register")}
        />
      )
  }
}
