import * as React from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import type { User } from "@/types"
import { AlertCircle, ArrowRight, Loader2, ShieldCheck, User as UserIcon } from "lucide-react"

export interface LoginFormProps extends React.ComponentProps<"form"> {
  onSuccess?: (user: User) => void
  onGuestContinue?: () => void
  onForgotPassword?: () => void
  onRegister?: () => void
}

export function LoginForm({
  className,
  onSuccess,
  onGuestContinue,
  onForgotPassword,
  onRegister,
  ...props
}: LoginFormProps) {
  const { t } = useTranslation()
  const [email, setEmail] = React.useState("admin@example.com")
  const [password, setPassword] = React.useState("admin123")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const resp = await api.login(email.trim(), password)
      if (resp.user) {
        onSuccess?.(resp.user)
      } else {
        // Fallback: fetch profile
        const me = await api.getMe()
        onSuccess?.(me)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"))
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail)
    setPassword(fillPass)
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("auth.loginTitle")}
          </h1>
          <p className="text-xs text-balance text-muted-foreground">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Email Field */}
        <Field>
          <FieldLabel htmlFor="email" className="text-xs font-semibold">
            {t("auth.email")}
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-10 text-xs rounded-xl"
          />
        </Field>

        {/* Password Field */}
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password" className="text-xs font-semibold">
              {t("auth.password")}
            </FieldLabel>
            <button
              type="button"
              onClick={() => onForgotPassword?.()}
              className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-10 text-xs rounded-xl font-mono"
          />
        </Field>

        {/* Submit Button */}
        <Field>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("auth.submitting")}
              </>
            ) : (
              <>
                {t("auth.submitLogin")}
                <ArrowRight className="ml-1.5 size-3.5" />
              </>
            )}
          </Button>
        </Field>

        <FieldSeparator className="text-[11px] text-muted-foreground uppercase tracking-wider">
          {t("auth.demoAccounts")}
        </FieldSeparator>

        {/* Demo Accounts Quick-Fill */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fillCredentials("admin@example.com", "admin123")}
            className="h-9 text-xs rounded-xl flex items-center justify-center gap-1.5 border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
          >
            <ShieldCheck className="size-3.5 text-primary" />
            <span className="font-semibold truncate">Admin</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fillCredentials("user@example.com", "user123")}
            className="h-9 text-xs rounded-xl flex items-center justify-center gap-1.5 border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
          >
            <UserIcon className="size-3.5 text-muted-foreground" />
            <span className="font-semibold truncate">{t("auth.demoUserLabel")}</span>
          </Button>
        </div>

        {onRegister && (
          <FieldDescription className="text-center">
            {t("auth.noAccount")}{" "}
            <button
              type="button"
              onClick={onRegister}
              className="text-primary font-semibold hover:underline underline-offset-4 cursor-pointer"
            >
              {t("auth.registerNow")}
            </button>
          </FieldDescription>
        )}

        {onGuestContinue && (
          <FieldDescription className="text-center pt-1">
            <button
              type="button"
              onClick={onGuestContinue}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 cursor-pointer"
            >
              {t("auth.guest")}
            </button>
          </FieldDescription>
        )}
      </FieldGroup>
    </form>
  )
}
