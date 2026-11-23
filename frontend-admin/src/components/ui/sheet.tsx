"use client"

import * as React from "react"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "@animate-ui/react/primitives/radix-ui"
import { Dialog as RadixDialog } from "radix-ui"

import { useReducedMotionPreference } from "@/features/theme/theme-context"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  const reducedMotion = useReducedMotionPreference()
  if (reducedMotion) {
    return <RadixDialog.Portal data-slot="sheet-portal" {...props} />
  }
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  const reducedMotion = useReducedMotionPreference()
  const overlayClass = cn("fixed inset-0 z-50 bg-black/50", className)
  if (reducedMotion) {
    return (
      <RadixDialog.Overlay
        data-slot="sheet-overlay"
        className={overlayClass}
        {...(props as React.ComponentProps<typeof RadixDialog.Overlay>)}
      />
    )
  }
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={overlayClass}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const reducedMotion = useReducedMotionPreference()
  const contentClass = cn(
    "fixed z-50 flex flex-col gap-4 bg-background shadow-lg outline-none",
    side === "right" &&
      "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
    side === "left" &&
      "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
    side === "top" &&
      "inset-x-0 top-0 h-auto border-b",
    side === "bottom" &&
      "inset-x-0 bottom-0 h-auto border-t",
    className
  )
  const closeBtn = showCloseButton && (
    <SheetPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary">
      <XIcon className="size-4" />
      <span className="sr-only">Close</span>
    </SheetPrimitive.Close>
  )

  return (
    <SheetPortal>
      <SheetOverlay />
      {reducedMotion ? (
        <RadixDialog.Content
          data-slot="sheet-content"
          data-side={side}
          className={contentClass}
          {...(props as React.ComponentProps<typeof RadixDialog.Content>)}
        >
          {children}
          {closeBtn}
        </RadixDialog.Content>
      ) : (
        <SheetPrimitive.Content
          data-slot="sheet-content"
          // `data-side` là thứ duy nhất primitive (Animate UI) dùng để chọn hướng
          // animation: right → trượt từ phải sang trái (translateX 100% → 0).
          // Thiếu nó, primitive rơi vào hiệu ứng "flip" (rotate + scale) và nếu ta
          // thêm cả CSS `animate-in` nữa thì hai animation chồng nhau → nháy.
          data-side={side}
          className={contentClass}
          {...props}
        >
          {children}
          {closeBtn}
        </SheetPrimitive.Content>
      )}
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
