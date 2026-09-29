"use client"

import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import {
  Button as LiquidButton,
  type LiquidButtonVariant,
} from "@/components/ui/liquid/button"
import { useLiquidMode } from "@/lib/liquid-mode"

/**
 * A shadcn Button that becomes a liquidcn Button in liquid mode.
 * `liquidVariant` picks the glass variant, e.g. `prominent` for the primary action.
 */
export function ThemedButton({
  variant,
  liquidVariant,
  ...props
}: ComponentProps<typeof Button> & { liquidVariant?: LiquidButtonVariant }) {
  const liquid = useLiquidMode()

  if (liquid) {
    return <LiquidButton variant={liquidVariant ?? variant ?? "default"} {...props} />
  }
  return <Button variant={variant} {...props} />
}
