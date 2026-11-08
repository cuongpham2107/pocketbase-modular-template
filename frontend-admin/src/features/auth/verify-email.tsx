import * as React from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldGroup } from "@/components/ui/field"
import { api } from "@/lib/api"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, MailCheck } from "lucide-react"

export interface VerifyEmailScreenProps extends React.ComponentProps<"div"> {
  /** Token lấy từ liên kết trong email (`?token=...`). */
  token: string
  onBack?: () => void
}

type VerifyState = "loading" | "success" | "error" | "missing"

export function VerifyEmailScreen({ className, token, onBack, ...props }: VerifyEmailScreenProps) {
  const { t } = useTranslation()
  const [state, setState] = React.useState<VerifyState>(token ? "loading" : "missing")
  const [message, setMessage] = React.useState<string>("")

  React.useEffect(() => {
    if (!token) return

    let cancelled = false

    api
      .verifyEmail(token)
      .then(() => {
        if (cancelled) return
        setState("success")
        setMessage(t("auth.verifySuccessBody"))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState("error")
        setMessage(err instanceof Error ? err.message : t("auth.verifyFailed"))
      })

    return () => {
      cancelled = true
    }
  }, [token, t])

  const icon =
    state === "loading" ? (
      <Loader2 className="size-6 animate-spin" />
    ) : state === "success" ? (
      <CheckCircle2 className="size-6" />
    ) : state === "missing" ? (
      <MailCheck className="size-6" />
    ) : (
      <AlertCircle className="size-6" />
    )

  const title =
    state === "loading"
      ? t("auth.verifyLoading")
      : state === "success"
        ? t("auth.verifySuccess")
        : state === "missing"
          ? t("auth.verifyNoToken")
          : t("auth.verifyFailedTitle")

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl",
              state === "error" || state === "missing"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary",
            )}
          >
            {icon}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-xs text-balance text-muted-foreground">
            {state === "missing"
              ? t("auth.verifyNoTokenHint")
              : state === "loading"
                ? t("auth.verifyLoadingHint")
                : message}
          </p>
        </div>

        {state === "success" && onBack && (
          <Button
            type="button"
            onClick={onBack}
            className="w-full h-10 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            {t("common.continue")}
          </Button>
        )}

        {(state === "error" || state === "missing") && (
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
    </div>
  )
}
