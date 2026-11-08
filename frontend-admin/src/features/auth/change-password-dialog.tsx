import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { AlertCircle, KeyRound, Loader2 } from "lucide-react"

export interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Gọi sau khi đổi mật khẩu thành công (backend thu hồi mọi phiên cũ). */
  onChanged?: () => void
}

export function ChangePasswordDialog({ open, onOpenChange, onChanged }: ChangePasswordDialogProps) {
  const { t } = useTranslation()
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reset = () => {
    setCurrent("")
    setNext("")
    setConfirm("")
    setError(null)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (next.length < 8) {
      setError(t("auth.passwordMinHint"))
      return
    }
    if (next !== confirm) {
      setError(t("auth.passwordMismatch"))
      return
    }
    if (next === current) {
      setError(t("auth.passwordSame"))
      return
    }

    setLoading(true)
    try {
      await api.changePassword(current, next)
      reset()
      onOpenChange(false)
      onChanged?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.changePasswordFailed"))
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold">
            <KeyRound className="size-4 text-primary" />
            {t("auth.changePasswordTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("auth.changePasswordHint")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="current_password" className="text-xs font-semibold">
                {t("auth.currentPassword")}
              </FieldLabel>
              <Input
                id="current_password"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10 text-xs rounded-xl font-mono"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="new_password_dialog" className="text-xs font-semibold">
                {t("auth.newPassword")}
              </FieldLabel>
              <Input
                id="new_password_dialog"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder={t("auth.passwordHint")}
                required
                autoComplete="new-password"
                className="h-10 text-xs rounded-xl font-mono"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="new_password_dialog_confirm" className="text-xs font-semibold">
                {t("auth.confirmNewPassword")}
              </FieldLabel>
              <Input
                id="new_password_dialog_confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="h-10 text-xs rounded-xl font-mono"
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 text-xs font-semibold rounded-xl cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                t("auth.changePasswordTitle")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
