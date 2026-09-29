"use client";
import type { ComponentProps } from "react";
import { Button as BaseButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLiquidElement } from "@/lib/motion";
import { useLiquidInteraction } from "@/lib/press";
import "./liquid.css";
type BaseProps = ComponentProps<typeof BaseButton>;
/** `prominent` is accent-tinted glass, like iOS `.glassProminent`. */
export type LiquidButtonVariant = NonNullable<BaseProps["variant"]> | "prominent";
export function Button({
  className,
  variant = "default",
  ref,
  ...props
}: Omit<BaseProps, "variant"> & { variant?: LiquidButtonVariant }) {
  const [node, mergedRef] = useLiquidElement(ref);
  useLiquidInteraction(node);
  return (
    <BaseButton
      ref={mergedRef}
      variant={variant === "prominent" ? "default" : variant}
      className={cn("liquid-surface liquid-button liquid-interactive", className)}
      data-liquid-variant={variant}
      {...props}
    />
  );
}
