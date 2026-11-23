import * as React from "react"
import { cn } from "cn"
import { Tooltip as TooltipPrimitive } from "@animate-ui/react/primitives/radix-ui"
import { Tooltip as RadixTooltip } from "radix-ui"

import { useReducedMotionPreference } from "@/features/theme/theme-context"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const reducedMotion = useReducedMotionPreference()
  const contentClass = cn(
    "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background",
    className
  )
  const arrowClass =
    "z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground"

  if (reducedMotion) {
    return (
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          data-slot="tooltip-content"
          sideOffset={sideOffset}
          className={contentClass}
          {...(props as React.ComponentProps<typeof RadixTooltip.Content>)}
        >
          {children}
          <RadixTooltip.Arrow className={arrowClass} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    )
  }

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={contentClass}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className={arrowClass} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
