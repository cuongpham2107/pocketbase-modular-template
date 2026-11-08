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
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"

export interface ForgotPasswordFormProps extends React.ComponentProps<"form"> {
  onBack?: () => void
}

export function ForgotPasswordForm({ className, onBack, ...props }: ForgotPasswordFormProps) {
  const { t } = useTranslation()
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await api.forgotPassword(email.trim())
      // Backend luôn trả thành công, kể cả email không tồn tại (chống dò tài khoản).
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.sendEmailFailed"))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("auth.checkInbox")}</h1>
            <p className="text-xs text-balance text-muted-foreground">
              {t("auth.forgotSentBody", { email })}
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

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("auth.forgotTitle")}</h1>
          <p className="text-xs text-balance text-muted-foreground">
            {t("auth.forgotSubtitle")}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="forgot_email" className="text-xs font-semibold">
            {t("auth.email")}
          </FieldLabel>
          <Input
            id="forgot_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="h-10 text-xs rounded-xl"
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
              {t("auth.sending")}
            </>
          ) : (
            t("auth.sendResetLink")
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
