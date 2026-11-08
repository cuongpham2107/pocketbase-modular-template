import * as React from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api, ApiError } from "@/lib/api"
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react"

export interface ResetPasswordFormProps extends React.ComponentProps<"form"> {
  /** Token lấy từ liên kết trong email (`?token=...`). */
  token: string
  onBack?: () => void
}

export function ResetPasswordForm({ className, token, onBack, ...props }: ResetPasswordFormProps) {
  const { t } = useTranslation()
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t("auth.passwordTooShort"))
      return
    }
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"))
      return
    }

    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "BAD_REQUEST") {
        setError(t("auth.resetInvalid"))
      } else {
        setError(err instanceof Error ? err.message : t("auth.resetFailed"))
      }
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("auth.missingTokenTitle")}
            </h1>
            <p className="text-xs text-balance text-muted-foreground">
              {t("auth.resetNoToken")}
            </p>
          </div>
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-full h-10 text-xs font-semibold rounded-xl cursor-pointer"
            >
              <ArrowLeft className="mr-1.5 size-3.5" />
              {t("auth.backToLogin")}
            </Button>
          )}
        </FieldGroup>
      </div>
    )
  }

  if (done) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("auth.resetDoneTitle")}
            </h1>
            <p className="text-xs text-balance text-muted-foreground">
              {t("auth.resetSuccess")}
            </p>
          </div>
          {onBack && (
            <Button
              type="button"
              onClick={onBack}
              className="w-full h-10 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              {t("auth.submitLogin")}
            </Button>
          )}
        </FieldGroup>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("auth.resetTitle")}</h1>
          <p className="text-xs text-balance text-muted-foreground">{t("auth.resetSubtitle")}</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="new_password" className="text-xs font-semibold">
            {t("auth.newPassword")}
          </FieldLabel>
          <Input
            id="new_password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordHint")}
            required
            autoComplete="new-password"
            className="h-10 text-xs rounded-xl font-mono"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="new_password_confirm" className="text-xs font-semibold">
            {t("auth.confirmNewPassword")}
          </FieldLabel>
          <Input
            id="new_password_confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="h-10 text-xs rounded-xl font-mono"
          />
        </Field>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("auth.updating")}
            </>
          ) : (
            t("auth.resetTitle")
          )}
        </Button>

        {onBack && (
          <FieldDescription className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3" />
              {t("auth.backToLogin")}
            </button>
          </FieldDescription>
        )}
      </FieldGroup>
    </form>
  )
}
