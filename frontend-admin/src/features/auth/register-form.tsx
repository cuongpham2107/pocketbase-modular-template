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
import { api } from "@/lib/api"
import type { User } from "@/types"
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react"

export interface RegisterFormProps extends React.ComponentProps<"form"> {
  onSuccess?: (user: User) => void
  onBack?: () => void
}

export function RegisterForm({ className, onSuccess, onBack, ...props }: RegisterFormProps) {
  const { t } = useTranslation()
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [loading, setLoading] = React.useState(false)
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
      const resp = await api.register(email.trim(), password, fullName.trim())
      onSuccess?.(resp.user)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.registerFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("auth.registerTitle")}</h1>
          <p className="text-xs text-balance text-muted-foreground">
            {t("auth.registerRoleHint")}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="full_name" className="text-xs font-semibold">
            {t("auth.fullName")}
          </FieldLabel>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            className="h-10 text-xs rounded-xl"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="register_email" className="text-xs font-semibold">
            {t("auth.email")}
          </FieldLabel>
          <Input
            id="register_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="h-10 text-xs rounded-xl"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="register_password" className="text-xs font-semibold">
            {t("auth.password")}
          </FieldLabel>
          <Input
            id="register_password"
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
          <FieldLabel htmlFor="register_confirm" className="text-xs font-semibold">
            {t("auth.confirmPassword")}
          </FieldLabel>
          <Input
            id="register_confirm"
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
              {t("auth.registerSubmitting")}
            </>
          ) : (
            <>
              {t("auth.submitRegister")}
              <ArrowRight className="ml-1.5 size-3.5" />
            </>
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
